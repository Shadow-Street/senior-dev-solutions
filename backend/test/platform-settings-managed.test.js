const { test, describe, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { app, db, USERS, bearer, stubUserLookup } = require('./helpers');
const { fakeTable } = require('./fakeModels');
const PlatformSettings = require('../src/services/PlatformSettingsService');

let settings;
let audits;

beforeEach(() => {
  PlatformSettings.__reset();
  stubUserLookup();
  settings = fakeTable().install(mock, db.PlatformSetting);
  audits = fakeTable().install(mock, db.AuditLog);
  mock.method(db.sequelize, 'transaction', async (cb) => cb({ LOCK: { UPDATE: 'UPDATE' } }));
});
afterEach(() => mock.restoreAll());

const call = (u, method, path, body) => {
  const r = request(app)[method](path);
  if (u) r.set('Authorization', bearer(u));
  return body === undefined ? r : r.send(body);
};
const save = (u, changes) => call(u, 'put', '/api/platform/settings/managed', { settings: changes });
const valueOf = (key) => (settings.rows.find((r) => r.key === key) || {}).value;

describe('registry validation', () => {
  const v = (key, raw) => PlatformSettings.validateValue(PlatformSettings.definitionFor(key), raw);

  test('types, bounds and formats are enforced', () => {
    assert.deepEqual(v('site_name', '  Protocall  '), { value: 'Protocall' });
    assert.ok(v('site_name', '').error);
    assert.ok(v('site_name', 'x'.repeat(81)).error);
    assert.ok(v('site_name', '<script>').error, 'no markup');
    assert.ok(v('contact_email', 'not-an-email').error);
    assert.deepEqual(v('contact_email', ''), { value: '' }, 'optional fields may be cleared');
    assert.ok(v('facebook_url', 'http://facebook.com/x').error, 'https only');
    assert.ok(v('facebook_url', 'javascript:alert(1)').error);
    assert.deepEqual(v('facebook_url', 'https://facebook.com/protocall'), { value: 'https://facebook.com/protocall' });
    assert.ok(v('support_phone', 'call me').error);
    assert.ok(v('global_commission_rate', 101).error);
    assert.ok(v('global_commission_rate', '12.345').error);
    assert.deepEqual(v('global_commission_rate', '12.5'), { value: 12.5 });
    assert.ok(v('maintenance_mode', 'yes').error);
    assert.deepEqual(v('maintenance_mode', 'true'), { value: true });
    assert.ok(v('session_idle_timeout_minutes', 1.5).error);
    assert.ok(v('login_max_failed_attempts', 2).error, '1-2 would lock people out on a typo');
    assert.deepEqual(v('login_max_failed_attempts', 0), { value: 0 });
    assert.deepEqual(v('login_max_failed_attempts', 5), { value: 5 });
  });

  test('navigation config: known shape only; settings tab cannot be hidden', () => {
    assert.deepEqual(v('nav_config_user', { items: [{ key: 'advisors', visible: false, label: ' Experts ', order: 2 }] }),
      { value: { items: [{ key: 'advisors', visible: false, label: 'Experts', order: 2 }] } });
    assert.ok(v('nav_config_user', { items: [{ key: 'a b' }] }).error);
    assert.ok(v('nav_config_user', { items: [{ key: 'x' }, { key: 'x' }] }).error, 'duplicates');
    assert.ok(v('nav_config_user', { items: [{ key: 'x', visible: 'no' }] }).error);
    assert.ok(v('nav_config_user', { items: [{ key: 'x', label: '<b>' }] }).error);
    assert.ok(v('nav_config_user', { items: [{ key: 'x', order: -1 }] }).error);
    assert.ok(v('nav_config_user', '{not json').error);
    assert.ok(v('nav_config_admin', { items: [{ key: 'settings', visible: false }] }).error);
    assert.deepEqual(v('nav_config_user', ''), { value: { items: [] } });
  });

  test('unreadable stored values fall back to the default', () => {
    const def = PlatformSettings.definitionFor('registration_enabled');
    assert.equal(PlatformSettings.parseStored(def, 'banana'), true);
    assert.equal(PlatformSettings.parseStored(PlatformSettings.definitionFor('maintenance_mode'), 'banana'), false);
    assert.deepEqual(PlatformSettings.parseStored(PlatformSettings.definitionFor('nav_config_user'), '{oops'), { items: [] });
  });
});

describe('GET /api/platform/settings/public-config', () => {
  test('anonymous; defaults filled in; only public keys; no secrets', async () => {
    settings.add({ key: 'site_name', value: 'Protocall Club' });
    settings.add({ key: 'razorpay_key_secret', value: 'leaked-secret' });
    settings.add({ key: 'login_max_failed_attempts', value: '5' });
    const res = await call(null, 'get', '/api/platform/settings/public-config');
    assert.equal(res.status, 200);
    assert.equal(res.body.site_name, 'Protocall Club');
    assert.equal(res.body.registration_enabled, true);
    assert.equal(res.body.maintenance_mode, false);
    assert.equal(res.body.seo_meta_title, 'Protocall - The Ultimate Social Trading Platform');
    assert.ok(!('login_max_failed_attempts' in res.body), 'security internals are not public');
    assert.ok(!('global_commission_rate' in res.body));
    assert.ok(!JSON.stringify(res.body).includes('leaked-secret'));
  });

  test('a database failure serves defaults rather than an error', async () => {
    mock.method(db.PlatformSetting, 'findAll', async () => { throw new Error('ER_NO_SUCH_TABLE'); });
    const res = await call(null, 'get', '/api/platform/settings/public-config');
    assert.equal(res.status, 200);
    assert.equal(res.body.site_name, 'Protocall');
    assert.equal(res.body.maintenance_mode, false);
  });
});

describe('GET /api/platform/settings/managed', () => {
  test('401 anonymous, 403 member', async () => {
    assert.equal((await call(null, 'get', '/api/platform/settings/managed')).status, 401);
    assert.equal((await call(USERS.user, 'get', '/api/platform/settings/managed')).status, 403);
  });

  test('admin gets definitions and values; only super admin may edit security', async () => {
    const admin = await call(USERS.admin, 'get', '/api/platform/settings/managed');
    assert.equal(admin.status, 200);
    assert.equal(admin.body.can_edit_security, false);
    const def = admin.body.definitions.find((d) => d.key === 'maintenance_mode');
    assert.equal(def.role, 'super_admin');
    assert.equal(admin.body.values.maintenance_mode, false);
    const sa = await call(USERS.superAdmin, 'get', '/api/platform/settings/managed');
    assert.equal(sa.body.can_edit_security, true);
  });
});

describe('PUT /api/platform/settings/managed', () => {
  test('saves, normalises, survives a re-read and is audited with old and new values', async () => {
    settings.add({ key: 'site_name', value: 'Protocall' });
    const res = await save(USERS.admin, { site_name: '  Protocall India ', global_commission_rate: '18' });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.deepEqual(res.body.changed.sort(), ['global_commission_rate', 'site_name']);
    assert.equal(valueOf('site_name'), 'Protocall India');
    assert.equal(valueOf('global_commission_rate'), '18');
    assert.equal(res.body.values.site_name, 'Protocall India');

    const again = await call(null, 'get', '/api/platform/settings/public-config');
    assert.equal(again.body.site_name, 'Protocall India', 'reflected immediately (cache invalidated)');

    assert.equal(audits.rows.length, 1);
    assert.equal(audits.rows[0].action, 'platform_settings_updated');
    assert.equal(audits.rows[0].user_id, USERS.admin.id);
    assert.deepEqual(audits.rows[0].old_data, { site_name: 'Protocall', global_commission_rate: 20 });
    assert.deepEqual(audits.rows[0].new_data, { site_name: 'Protocall India', global_commission_rate: 18 });
  });

  test('unchanged values are not rewritten or audited', async () => {
    settings.add({ key: 'site_name', value: 'Protocall' });
    const res = await save(USERS.admin, { site_name: 'Protocall' });
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.changed, []);
    assert.equal(audits.rows.length, 0);
  });

  test('all-or-nothing: one invalid value rejects the batch with a per-field message', async () => {
    const res = await save(USERS.admin, { site_name: 'Fine', contact_email: 'nope' });
    assert.equal(res.status, 400);
    assert.ok(res.body.fields.contact_email);
    assert.equal(settings.rows.length, 0, 'nothing written');
    assert.equal(audits.rows.length, 0);
  });

  test('unknown keys, env-only secrets and ads_enabled are refused', async () => {
    for (const changes of [{ anything_goes: '1' }, { razorpay_key_secret: 'x' }, { razorpay_webhook_secret: 'x' }, { ads_enabled: false }]) {
      const res = await save(USERS.superAdmin, changes);
      assert.equal(res.status, 400, JSON.stringify(changes));
    }
    assert.equal(settings.rows.length, 0);
  });

  test('security settings need super admin; admin is refused and nothing is written', async () => {
    const res = await save(USERS.admin, { site_name: 'Ok', maintenance_mode: true });
    assert.equal(res.status, 403);
    assert.equal(settings.rows.length, 0);
    const ok = await save(USERS.superAdmin, { maintenance_mode: true, registration_enabled: false });
    assert.equal(ok.status, 200);
    assert.equal(valueOf('maintenance_mode'), 'true');
    assert.equal(valueOf('registration_enabled'), 'false');
  });

  test('members and anonymous callers cannot save', async () => {
    assert.equal((await save(null, { site_name: 'x' })).status, 401);
    assert.equal((await save(USERS.user, { site_name: 'x' })).status, 403);
    assert.equal(settings.rows.length, 0);
  });

  test('malformed body is a 400', async () => {
    assert.equal((await call(USERS.admin, 'put', '/api/platform/settings/managed', { settings: ['site_name'] })).status, 400);
    assert.equal((await call(USERS.admin, 'put', '/api/platform/settings/managed', {})).status, 400);
  });
});

describe('generic CRUD writes go through the same rules', () => {
  test('env-only secrets cannot be created, even by super admin', async () => {
    const res = await call(USERS.superAdmin, 'post', '/api/platform/settings', { key: 'razorpay_key_secret', value: 'x' });
    assert.equal(res.status, 403);
    assert.equal((await call(USERS.superAdmin, 'put', '/api/platform/settings/key/razorpay_webhook_secret', { value: 'x' })).status, 403);
    assert.equal(settings.rows.length, 0);
  });

  test('a managed key written by id is validated, normalised and audited', async () => {
    const row = settings.add({ key: 'global_commission_rate', value: '20' });
    const bad = await call(USERS.admin, 'put', `/api/platform/settings/${row.id}`, { value: '250' });
    assert.equal(bad.status, 400);
    assert.equal(row.value, '20');
    const ok = await call(USERS.admin, 'put', `/api/platform/settings/${row.id}`, { value: ' 15 ' });
    assert.equal(ok.status, 200);
    assert.equal(row.value, '15');
    await new Promise((r) => setImmediate(r));
    assert.equal(audits.rows.length, 1);
    assert.deepEqual(audits.rows[0].new_data, { global_commission_rate: 15 });
  });

  test('admin cannot reach a super-admin setting through the generic routes', async () => {
    const row = settings.add({ key: 'maintenance_mode', value: 'false' });
    assert.equal((await call(USERS.admin, 'put', `/api/platform/settings/${row.id}`, { value: 'true' })).status, 403);
    assert.equal((await call(USERS.admin, 'post', '/api/platform/settings', { key: 'registration_enabled', value: 'false' })).status, 403);
    assert.equal((await call(USERS.admin, 'put', '/api/platform/settings/key/maintenance_mode', { value: 'true' })).status, 403);
    assert.equal(row.value, 'false');
  });

  test('a percent-encoded id cannot slip past the guard (PUT and DELETE)', async () => {
    const row = settings.add({ key: 'maintenance_mode', value: 'false' });
    const ads = settings.add({ key: 'ads_enabled', value: 'false' });
    ads.destroy = async () => { settings.rows.splice(settings.rows.indexOf(ads), 1); };
    const enc = (id) => `%${id.charCodeAt(0).toString(16)}${id.slice(1)}`;
    assert.equal((await call(USERS.admin, 'put', `/api/platform/settings/${enc(row.id)}`, { value: 'true' })).status, 403);
    assert.equal(row.value, 'false');
    assert.equal((await call(USERS.superAdmin, 'delete', `/api/platform/settings/${enc(ads.id)}`)).status, 403);
    assert.ok(settings.rows.includes(ads), 'ads row survives');
    assert.equal((await call(USERS.admin, 'put', '/api/platform/settings/%E0%A4%A', { value: 'x' })).status, 400, 'malformed encoding');
    assert.equal((await call(USERS.admin, 'put', '/api/platform/settings/not-a-row', { value: 'x' })).status, 404, 'fails closed');
    assert.equal(audits.rows.length, 0);
  });

  test('spelling variants of protected keys are refused everywhere', async () => {
    for (const key of ['MAINTENANCE_MODE', 'Ads_Enabled', 'Razorpay_Key_Secret']) {
      assert.equal((await call(USERS.superAdmin, 'put', `/api/platform/settings/key/${key}`, { value: 'true' })).status, 400, key);
      assert.equal((await call(USERS.superAdmin, 'post', '/api/platform/settings', { key, value: 'true' })).status, 400, key);
    }
    assert.equal((await save(USERS.superAdmin, { MAINTENANCE_MODE: true })).status, 400);
    assert.equal(settings.rows.length, 0);
  });

  test('a row cannot be renamed through the generic update', async () => {
    const row = settings.add({ key: 'tomorrows_pick_override', value: 'TCS' });
    assert.equal((await call(USERS.admin, 'put', `/api/platform/settings/${row.id}`, { key: 'site_name', value: 'x' })).status, 400);
    assert.equal(row.key, 'tomorrows_pick_override');
  });

  test('creating a second row for a managed key is refused', async () => {
    settings.add({ key: 'global_commission_rate', value: '20' });
    assert.equal((await call(USERS.admin, 'post', '/api/platform/settings', { key: 'global_commission_rate', value: '10' })).status, 409);
    assert.equal(settings.rows.length, 1);
  });

  test('alert retention is super admin only and at least 30 days', async () => {
    assert.equal((await save(USERS.admin, { alert_retention_days: 90 })).status, 403);
    assert.equal((await save(USERS.superAdmin, { alert_retention_days: 1 })).status, 400);
    assert.equal((await save(USERS.superAdmin, { alert_retention_days: 30 })).status, 200);
  });

  test('bulk writes cannot touch managed keys', async () => {
    const row = settings.add({ key: 'site_name', value: 'Protocall' });
    assert.equal((await call(USERS.admin, 'put', '/api/platform/settings/bulk', { ids: [row.id], data: { value: '' } })).status, 403);
    assert.equal(row.value, 'Protocall');
  });

  test('PUT /key/:key validates managed keys', async () => {
    assert.equal((await call(USERS.admin, 'put', '/api/platform/settings/key/support_email', { value: 'bad' })).status, 400);
    const ok = await call(USERS.admin, 'put', '/api/platform/settings/key/support_email', { value: 'help@protocall.in' });
    assert.equal(ok.status, 200);
    assert.equal(valueOf('support_email'), 'help@protocall.in');
  });

  test('unmanaged keys keep working for other admin screens', async () => {
    const res = await call(USERS.admin, 'post', '/api/platform/settings', { key: 'tomorrows_pick_override', value: 'RELIANCE' });
    assert.equal(res.status, 201);
  });
});

describe('settings cache', () => {
  test('a read in flight during a save cannot put the old value back', async () => {
    const row = settings.add({ key: 'maintenance_mode', value: 'false' });
    const realFindAll = db.PlatformSetting.findAll;
    let release;
    let first = true;
    mock.method(db.PlatformSetting, 'findAll', async (opts) => {
      if (first && opts && opts.where && opts.where.key) {
        first = false;
        const snapshot = settings.rows.map((r) => ({ key: r.key, value: r.value }));
        await new Promise((r) => { release = r; });
        return snapshot;
      }
      return realFindAll(opts);
    });
    const stale = PlatformSettings.getAll(); // starts a load, held open
    await new Promise((r) => setImmediate(r));
    // Through the service: over HTTP the maintenance gate would itself wait
    // on the held read.
    await PlatformSettings.saveSettings({ maintenance_mode: true }, { user: USERS.superAdmin });
    assert.equal((await PlatformSettings.getAll()).maintenance_mode, true, 'a read after the save sees it (no wait on the stale read)');
    release();
    await stale;
    assert.equal(await PlatformSettings.getValue('maintenance_mode'), true, 'old read did not overwrite the cache');
    assert.equal(row.value, 'true');
  });

  test('after a successful read, a database error keeps the last known values', async () => {
    settings.add({ key: 'registration_enabled', value: 'false' });
    assert.equal(await PlatformSettings.getValue('registration_enabled'), false);
    PlatformSettings.invalidate();
    mock.method(db.PlatformSetting, 'findAll', async () => { throw new Error('connection lost'); });
    assert.equal(await PlatformSettings.getValue('registration_enabled'), false, 'sign-ups stay closed');
  });
});

describe('secret leakage', () => {
  test('env-only secrets are blanked for staff too in list / key / bulk-get', async () => {
    settings.add({ key: 'razorpay_key_secret', value: 'stale-secret' });
    settings.add({ key: 'stock_data_api_key', value: 'stale-key' });
    settings.add({ key: 'site_name', value: 'Protocall' });
    for (const u of [USERS.admin, USERS.superAdmin]) {
      const list = await call(u, 'get', '/api/platform/settings');
      assert.equal(list.status, 200);
      assert.ok(!JSON.stringify(list.body).includes('stale-'), 'list');
      const one = await call(u, 'get', '/api/platform/settings/key/razorpay_key_secret');
      assert.equal(one.body.value, null);
      const bulk = await call(u, 'post', '/api/platform/settings/bulk-get', { keys: ['razorpay_key_secret', 'site_name'] });
      assert.equal(bulk.body.razorpay_key_secret, null);
      assert.equal(bulk.body.site_name, 'Protocall');
    }
  });

  test('non-public managed values (lockout threshold, defaults) are blanked for non-staff', async () => {
    settings.add({ key: 'login_max_failed_attempts', value: '5' });
    settings.add({ key: 'site_name', value: 'Protocall' });
    const anon = await call(null, 'get', '/api/platform/settings');
    const row = anon.body.find((r) => r.key === 'login_max_failed_attempts');
    assert.equal(row.value, null);
    assert.equal(anon.body.find((r) => r.key === 'site_name').value, 'Protocall');
    const bulk = await call(USERS.user, 'post', '/api/platform/settings/bulk-get', { keys: ['login_max_failed_attempts'] });
    assert.equal(bulk.body.login_max_failed_attempts, null);
    const staff = await call(USERS.admin, 'get', '/api/platform/settings');
    assert.equal(staff.body.find((r) => r.key === 'login_max_failed_attempts').value, '5');
  });

  test('integrations status: admin only, booleans and mode, never a value', async () => {
    assert.equal((await call(null, 'get', '/api/platform/settings/integrations-status')).status, 401);
    assert.equal((await call(USERS.user, 'get', '/api/platform/settings/integrations-status')).status, 403);
    const res = await call(USERS.admin, 'get', '/api/platform/settings/integrations-status');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.razorpay, { configured: true, mode: 'test', webhook_configured: true });
    const text = JSON.stringify(res.body);
    for (const secret of [process.env.RAZORPAY_KEY_SECRET, process.env.RAZORPAY_KEY_ID, process.env.RAZORPAY_WEBHOOK_SECRET, process.env.GOOGLE_CLIENT_ID]) {
      assert.ok(!text.includes(secret), 'no env value in the response');
    }
  });

  test('bulk-get rejects a malformed keys list', async () => {
    assert.equal((await call(null, 'post', '/api/platform/settings/bulk-get', { keys: 'site_name' })).status, 400);
  });
});
