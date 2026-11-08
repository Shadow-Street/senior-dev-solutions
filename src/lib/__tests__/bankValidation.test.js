import { addBankAccountSchema, editBankAccountSchema, parseRupeesToPaise, validateWithdrawalAmount } from '@/lib/bankValidation'

const good = {
  account_holder_name: 'Asha Rao',
  bank_name: 'HDFC Bank',
  account_number: '1234 5678 9012',
  confirm_account_number: '123456789012',
  ifsc: 'hdfc0001234',
  account_type: 'savings',
}

describe('addBankAccountSchema', () => {
  it('accepts a valid account and normalises IFSC and the number', () => {
    const r = addBankAccountSchema.safeParse(good)
    expect(r.success).toBe(true)
    expect(r.data.ifsc).toBe('HDFC0001234')
    expect(r.data.account_number).toBe('123456789012')
  })

  it.each([
    ['bad IFSC', { ifsc: 'HDFC1001234' }, 'ifsc'],
    ['short number', { account_number: '12345678', confirm_account_number: '12345678' }, 'account_number'],
    ['long number', { account_number: '1'.repeat(19), confirm_account_number: '1'.repeat(19) }, 'account_number'],
    ['letters in number', { account_number: '12345678A', confirm_account_number: '12345678A' }, 'account_number'],
    ['mismatched confirmation', { confirm_account_number: '999999999999' }, 'confirm_account_number'],
    ['empty holder', { account_holder_name: '' }, 'account_holder_name'],
    ['bad type', { account_type: 'joint' }, 'account_type'],
  ])('rejects %s', (_label, patch, field) => {
    const r = addBankAccountSchema.safeParse({ ...good, ...patch })
    expect(r.success).toBe(false)
    expect(r.error.issues.some((i) => i.path[0] === field)).toBe(true)
  })
})

describe('editBankAccountSchema', () => {
  it('lets the account number stay blank', () => {
    expect(editBankAccountSchema.safeParse({ ...good, account_number: '', confirm_account_number: '' }).success).toBe(true)
  })
  it('validates a replacement number', () => {
    expect(editBankAccountSchema.safeParse({ ...good, account_number: '123', confirm_account_number: '123' }).success).toBe(false)
  })
})

describe('withdrawal amounts', () => {
  it('parses to paise and rejects junk', () => {
    expect(parseRupeesToPaise('1500.50')).toBe(150050)
    for (const bad of ['', '0', '-5', 'abc', '1.234', '1e3']) expect(parseRupeesToPaise(bad)).toBeNull()
  })
  it('enforces the available balance', () => {
    expect(validateWithdrawalAmount('100', 100)).toBe('')
    expect(validateWithdrawalAmount('100.01', 100)).toMatch(/exceeds/)
    expect(validateWithdrawalAmount('0', 100)).toMatch(/greater than 0/)
  })
})
