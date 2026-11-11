import { escapeHtml, safeUrl } from './escapeHtml'
import { isSafeHref, renderInline } from '../Components/LandingPage/ds/blogMarkup'

test('record values cannot become markup in a printout', () => {
    expect(escapeHtml('<img src=x onerror="alert(1)">')).toBe('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;')
    expect(escapeHtml("Mama's & Sons")).toBe('Mama&#39;s &amp; Sons')
    expect(escapeHtml(null)).toBe('')
    expect(escapeHtml(0)).toBe('0')
})

test('image addresses keep web, inline image and site paths only', () => {
    expect(safeUrl('https://api.epxcentral.com/public/logo-proxy/abc')).toBe('https://api.epxcentral.com/public/logo-proxy/abc')
    expect(safeUrl('/logo.png')).toBe('/logo.png')
    expect(safeUrl('data:image/png;base64,AAA')).toBe('data:image/png;base64,AAA')
    expect(safeUrl('javascript:alert(1)')).toBe('')
    expect(safeUrl('x" onerror="alert(1)')).toBe('')
    expect(safeUrl('//evil.example/a.png')).toBe('')
    expect(safeUrl('https://a.example/x"onload="y')).toBe('https://a.example/x&quot;onload=&quot;y')
})

test('blog links keep web, mail, on-page and on-site targets only', () => {
    ['https://example.com', 'mailto:hi@example.com', '#ref-1', '/products/journals'].forEach((href) => expect(isSafeHref(href)).toBe(true))
    ;['javascript:alert(1)', ' JavaScript:alert(1)', 'data:text/html,x', '//evil.example', 'vbscript:x'].forEach((href) => expect(isSafeHref(href)).toBe(false))
})

test('a javascript: link in a post shows as plain text', () => {
    const out = renderInline('see [this](javascript:alert(1)) now')
    const html = JSON.stringify(out)
    expect(html).not.toMatch(/javascript:/)
    expect(html).toMatch(/this/)
    const kept = JSON.stringify(renderInline('read [the docs](https://example.com/docs)'))
    expect(kept).toMatch(/"href":"https:\/\/example.com\/docs"/)
})
