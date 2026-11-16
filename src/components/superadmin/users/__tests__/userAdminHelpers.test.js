import { statusInfo, isRestricted, visibleSections, hasAnyAction } from '../userAdminHelpers'
import { csvCell } from '../adminUsersApi'

describe('User Management helpers', () => {
  it('labels every account status the API can return', () => {
    expect(statusInfo({ status: 'active' }).label).toBe('Active')
    expect(statusInfo({ status: 'inactive' }).label).toBe('Deactivated')
    expect(statusInfo({ status: 'banned' }).label).toBe('Blocked')
    expect(statusInfo({ status: 'suspended' }).label).toBe('Suspended')
    expect(statusInfo({ status: 'suspended', suspended_until: '2030-01-15T10:00:00Z' }).label).toMatch(/^Suspended until .*2030/)
  })

  it('offers Reactivate for every non-active account', () => {
    expect(['inactive', 'suspended', 'banned'].every((status) => isRestricted({ status }))).toBe(true)
    expect(isRestricted({ status: 'active' })).toBe(false)
  })

  it('shows a sub-admin only the sections their permissions open', () => {
    const all = ['dashboard', 'users', 'feedback', 'settings']
    expect(visibleSections({ is_super_admin: true }, all)).toEqual(all)
    expect(visibleSections({ role: 'admin' }, all)).toEqual(all)
    expect(visibleSections({ role: 'sub_admin', sections: ['feedback', 'users'] }, all)).toEqual(['users', 'feedback'])
    expect(visibleSections({ role: 'user', sections: [] }, all)).toEqual([])
    expect(visibleSections(null, all)).toEqual([])
  })

  it('knows when a row has no actions', () => {
    expect(hasAnyAction({ edit: false, role: false })).toBe(false)
    expect(hasAnyAction({ edit: false, delete: true })).toBe(true)
  })

  it('quotes CSV cells and defuses spreadsheet formulas', () => {
    expect(csvCell('a "b", c')).toBe('"a ""b"", c"')
    expect(csvCell('=HYPERLINK("x")')).toBe('"\'=HYPERLINK(""x"")"')
    expect(csvCell(null)).toBe('""')
  })
})
