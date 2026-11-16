import { applyNavConfig, editorRows, rowsToConfig, USER_NAV_DEFAULTS, ADMIN_NAV_LOCKED } from '@/lib/navigationConfig'

const ITEMS = [
  { key: 'dashboard', title: 'Dashboard' },
  { key: 'advisors', title: 'Advisors' },
  { key: 'subscription', title: 'Subscription Plans' },
]
const withTitle = { withLabel: (e, title) => ({ ...e, title }) }

describe('applyNavConfig', () => {
  it('leaves the sidebar exactly as coded when nothing is configured or the config is junk', () => {
    for (const config of [undefined, null, {}, { items: [] }, { items: 'x' }, 'oops', { items: [null, 5] }]) {
      expect(applyNavConfig(ITEMS, config, withTitle)).toBe(ITEMS)
    }
  })

  it('hides, renames and reorders; unknown keys are ignored', () => {
    const out = applyNavConfig(ITEMS, { items: [
      { key: 'subscription', order: 0, label: 'Plans' },
      { key: 'dashboard', order: 1 },
      { key: 'advisors', visible: false },
      { key: 'nope', order: -5 },
    ] }, withTitle)
    expect(out.map((i) => i.title)).toEqual(['Plans', 'Dashboard'])
  })

  it('entries without an order keep their coded position (ties keep coded order)', () => {
    const out = applyNavConfig(ITEMS, { items: [{ key: 'subscription', order: 0 }] }, withTitle)
    expect(out.map((i) => i.key)).toEqual(['dashboard', 'subscription', 'advisors'])
  })

  it('never hides a locked entry and ignores blank labels', () => {
    const out = applyNavConfig([{ key: 'settings', label: 'Platform Settings' }], { items: [{ key: 'settings', visible: false, label: '  ' }] }, { locked: ADMIN_NAV_LOCKED })
    expect(out).toEqual([{ key: 'settings', label: 'Platform Settings' }])
  })
})

describe('editor rows', () => {
  it('round-trips: defaults produce a config that changes nothing; edits are kept', () => {
    const rows = editorRows(USER_NAV_DEFAULTS, null)
    expect(rows.map((r) => r.key)).toEqual(USER_NAV_DEFAULTS.map((d) => d.key))
    const config = rowsToConfig(rows)
    expect(config.items.every((i) => i.visible && i.label === undefined)).toBe(true)

    const edited = [...rows].reverse().map((r) => (r.key === 'advisors' ? { ...r, label: 'Experts', visible: false } : r))
    const saved = rowsToConfig(edited)
    const back = editorRows(USER_NAV_DEFAULTS, saved)
    expect(back[0].key).toBe('subscription')
    const advisors = back.find((r) => r.key === 'advisors')
    expect(advisors).toMatchObject({ label: 'Experts', visible: false })
  })
})
