import { describe, it, expect } from 'vitest';
import {
  csvCell, csvToRooms, filterRooms, inviteLink, messagesToCsv, normalizePlan, parseCsv, roomState, roomsToCsv, validateRoomForm,
} from '../chatRoomUtils';

const rooms = [
  { id: '1', name: 'Reliance', stock_symbol: 'RELIANCE', room_type: 'stock_specific', required_plan: 'basic', status: 'active', online_count: 2 },
  { id: '2', name: 'VIP Lounge', room_type: 'premium', required_plan: 'vip', status: 'active', locked: true },
  { id: '3', name: 'Old talk', description: 'retired', room_type: 'general', required_plan: null, status: 'archived' },
  { id: '4', name: 'Sector: IT', room_type: 'sector', required_plan: 'premium', status: null },
];

describe('filterRooms', () => {
  it('matches search against name, description and symbol', () => {
    expect(filterRooms(rooms, { search: 'relia' }).map((r) => r.id)).toEqual(['1']);
    expect(filterRooms(rooms, { search: 'RETIRED' }).map((r) => r.id)).toEqual(['3']);
  });
  it('treats basic/null as the Free plan', () => {
    expect(filterRooms(rooms, { plan: 'free' }).map((r) => r.id)).toEqual(['1', '3']);
    expect(filterRooms(rooms, { plan: 'vip' }).map((r) => r.id)).toEqual(['2']);
  });
  it('filters by live/locked/archived state and type', () => {
    expect(filterRooms(rooms, { status: 'live' }).map((r) => r.id)).toEqual(['1']);
    expect(filterRooms(rooms, { status: 'locked' }).map((r) => r.id)).toEqual(['2']);
    expect(filterRooms(rooms, { status: 'archived' }).map((r) => r.id)).toEqual(['3']);
    expect(filterRooms(rooms, { status: 'active' }).map((r) => r.id)).toEqual(['1', '2', '4']);
    expect(filterRooms(rooms, { type: 'sector' }).map((r) => r.id)).toEqual(['4']);
  });
  it('roomState prefers archived over locked over live', () => {
    expect(roomState({ status: 'archived', locked: true, online_count: 3 })).toBe('archived');
    expect(roomState({ locked: true, online_count: 3 })).toBe('locked');
    expect(roomState({ online_count: 0 })).toBe('idle');
  });
});

describe('CSV export', () => {
  it('neutralises spreadsheet formulas and escapes quotes', () => {
    expect(csvCell('=HYPERLINK("http://x")')).toBe('"\'=HYPERLINK(""http://x"")"');
    expect(csvCell('+1')).toBe('"\'+1"');
    expect(csvCell('-2')).toBe('"\'-2"');
    expect(csvCell('@SUM(A1)')).toBe('"\'@SUM(A1)"');
    expect(csvCell('plain, text')).toBe('"plain, text"');
    expect(csvCell(null)).toBe('""');
  });
  it('exports exactly the rooms given, one line each plus a header', () => {
    const csv = roomsToCsv([{ ...rooms[0], name: '=cmd|calc' }]);
    const lines = csv.split('\r\n');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain('"Name"');
    expect(lines[1]).toContain('"\'=cmd|calc"');
    expect(lines[1]).toContain('"Free"');
  });
  it('exports messages with author and content', () => {
    const csv = messagesToCsv('Room', [{ id: 'm', content: '-danger', author: { name: 'A', email: 'a@x' }, created_at: '2026-01-01T00:00:00Z' }]);
    expect(csv.split('\r\n')[1]).toContain('"\'-danger"');
  });
});

describe('CSV import', () => {
  it('parses quoted cells, commas and CRLF', () => {
    expect(parseCsv('a,b\r\n"x, y","he said ""hi"""\n')).toEqual([['a', 'b'], ['x, y', 'he said "hi"']]);
  });
  it('maps rows to room payloads and reports bad lines', () => {
    const { rooms: out, errors } = csvToRooms('Name,Room Type,stock_symbol,required_plan,is_public\nTCS,stock_specific,tcs,basic,no\n,general,,,\nX,bogus,,,\n');
    expect(out).toEqual([{ name: 'TCS', description: '', room_type: 'stock_specific', stock_symbol: 'TCS', required_plan: 'free', is_public: false, admin_only_post: false }]);
    expect(errors).toEqual(['Line 3: name is missing', 'Line 4: unknown room_type "bogus"']);
  });
  it('requires a name column', () => {
    expect(csvToRooms('title\nx').errors[0]).toMatch(/name/);
  });
});

describe('form validation and helpers', () => {
  it('validateRoomForm mirrors the server rules', () => {
    expect(validateRoomForm({ name: 'a' }).name).toBeTruthy();
    expect(validateRoomForm({ name: 'Ok', room_type: 'stock_specific', stock_symbol: '' }).stock_symbol).toBeTruthy();
    expect(validateRoomForm({ name: 'Ok', stock_symbol: 'bad symbol!' }).stock_symbol).toBeTruthy();
    expect(validateRoomForm({ name: 'Ok', room_type: 'general' })).toEqual({});
  });
  it('normalizePlan and inviteLink', () => {
    expect(normalizePlan('Basic')).toBe('free');
    expect(normalizePlan('VIP')).toBe('vip');
    expect(inviteLink('AB CD', 'https://app.test')).toBe('https://app.test/ChatRooms?invite=AB%20CD');
  });
});
