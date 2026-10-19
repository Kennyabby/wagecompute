import { landingPathOf, openablePages } from './modulePages'

describe('default module after sign-in', () => {
    const enabled = ['dashboard', 'settings', 'inventory', 'business-central', 'journals']

    test('no default chosen keeps the usual behaviour', () => {
        expect(landingPathOf({ permissions: ['inventory'] }, enabled)).toBeNull()
    })

    test('a permitted default is where the user lands', () => {
        expect(landingPathOf({ permissions: ['inventory', 'business-central'], defaultModule: 'business-central' }, enabled)).toBe('/business-central')
    })

    test('a default the user lost permission for is ignored', () => {
        expect(landingPathOf({ permissions: ['inventory'], defaultModule: 'business-central' }, enabled)).toBeNull()
    })

    test('a default the workspace does not have is ignored', () => {
        expect(landingPathOf({ permissions: ['all'], defaultModule: 'payroll' }, enabled)).toBeNull()
    })

    test('admins can land on any enabled module', () => {
        expect(landingPathOf({ status: 'admin', permissions: [], defaultModule: 'journals' }, enabled)).toBe('/journals')
    })

    test('journals opens with either the journals or the reports permission', () => {
        expect(openablePages({ permissions: ['reports'] }, ['reports']).map((page) => page.key)).toEqual(['journals'])
    })

    test('an unknown workspace module list leaves permissions to decide', () => {
        expect(openablePages({ permissions: ['sales'] }).map((page) => page.key)).toEqual(['sales'])
    })
})
