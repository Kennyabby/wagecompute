import { backlogActive } from './viewWindow'

const now = Date.UTC(2026, 10, 11, 12)

test('backlog access is in force until its end time, then not', () => {
    const profile = { permissions: ['allowBacklogs'], backlogExpiresAt: now + 60 * 1000 }
    expect(backlogActive(profile, now)).toBe(true)
    expect(backlogActive(profile, now + 60 * 1000)).toBe(false)
})

test('a grant from before end times existed still counts until the server gives it one', () => {
    expect(backlogActive({ permissions: ['allowBacklogs'] }, now)).toBe(true)
})

test('without the permission there is no access, and "all" is a standing grant', () => {
    expect(backlogActive({ permissions: ['sales'] }, now)).toBe(false)
    expect(backlogActive({ permissions: ['all'], backlogExpiresAt: now - 1 }, now)).toBe(true)
    expect(backlogActive(null, now)).toBe(false)
})
