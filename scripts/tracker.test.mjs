import { parseTracker, validate } from './tracker.mjs'

const doc = (rows) => `# T\n<!-- tracker:items:start -->\n| ID | P | Status | Area | Title | Owner | Evidence / notes |\n|---|---|---|---|---|---|---|\n${rows.join('\n')}\n<!-- tracker:items:end -->\n`

describe('tracker', () => {
  it('parses rows between the markers', () => {
    const items = parseTracker(doc(['| SEC-1 | P0 | todo | SEC | Fix it | me | - |']))
    expect(items).toEqual([{ id: 'SEC-1', priority: 'P0', status: 'todo', area: 'SEC', title: 'Fix it', owner: 'me', evidence: '-' }])
  })

  it('rejects done without evidence, duplicates and bad values', () => {
    const items = parseTracker(doc([
      '| QA-1 | P1 | done | QA | Tests | me | - |',
      '| QA-1 | P9 | later | QA | Dup | me | x |',
    ]))
    const errors = validate(items)
    expect(errors).toEqual(expect.arrayContaining([
      'QA-1: done without evidence',
      'QA-1: duplicate ID',
      'QA-1: invalid priority "P9"',
      'QA-1: invalid status "later"',
    ]))
  })

  it('fails loudly when the markers are missing', () => {
    expect(() => parseTracker('# nothing here')).toThrow(/markers/)
  })
})
