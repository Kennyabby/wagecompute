import fetchServer from './fetchServer'

const reply = (status, body) => Promise.resolve({ status, ok: status >= 200 && status < 300, json: () => Promise.resolve(body) })

describe('token refresh', () => {
    afterEach(() => { delete global.fetch })

    test('requests refused together share one refresh and nobody is signed out', async () => {
        let refreshes = 0
        global.fetch = jest.fn((url) => {
            if (url.endsWith('/token')) {
                refreshes += 1
                // A second refresh with the replaced token is what used to fail.
                return refreshes === 1 ? reply(200, { accessToken: 'fresh' }) : reply(403, { message: 'Refresh token revoked or expired' })
            }
            // Refused for this user's access, before and after the refresh.
            return reply(403, { ok: false, err: true, mess: 'Your access to Business Central does not include the Data Sync tab.' })
        })
        window.localStorage.setItem('sessn-id', 'abc')

        const answers = await Promise.all(['bc/sync/history', 'bc/sync/storage', 'bc/changes'].map((endpoint) => fetchServer('GET', {}, endpoint, 'https://api.test')))

        expect(refreshes).toBe(1)
        answers.forEach((answer) => {
            expect(answer.err).toBe(true)
            expect(answer.mess).toMatch(/does not include/)
        })
        expect(window.localStorage.getItem('sessn-id')).toBe('abc')
    })
})
