// A small, dependency-free markdown-lite renderer for Epsilon's replies —
// handles the handful of things a model actually produces in a chat answer
// (bold, italic, inline code, bullet/numbered lists, paragraphs) without
// pulling in a full markdown library for what's a fairly narrow need.
// Deliberately returns React elements built from plain text, never
// dangerouslySetInnerHTML — model output is never trusted as raw HTML.
import React from 'react'

const renderInline = (text, keyPrefix) => {
    // Split on **bold**, *italic*/_italic_, and `code` — order matters so
    // ** is matched before single *.
    const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*|_[^_]+_)/g
    const parts = text.split(pattern).filter((p) => p !== '')
    return parts.map((part, i) => {
        const key = `${keyPrefix}-${i}`
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={key}>{part.slice(2, -2)}</strong>
        }
        if (part.startsWith('`') && part.endsWith('`')) {
            return <code key={key} className="epsilon-inline-code">{part.slice(1, -1)}</code>
        }
        if ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_'))) {
            return <em key={key}>{part.slice(1, -1)}</em>
        }
        return <React.Fragment key={key}>{part}</React.Fragment>
    })
}

const renderMarkdownLite = (text) => {
    const lines = String(text || '').split('\n')
    const blocks = []
    let i = 0
    let blockIndex = 0

    while (i < lines.length) {
        const line = lines[i]

        if (/^\s*[-*]\s+/.test(line)) {
            const items = []
            while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
                items.push(lines[i].replace(/^\s*[-*]\s+/, ''))
                i += 1
            }
            blockIndex += 1
            blocks.push(
                <ul key={`ul-${blockIndex}`} className="epsilon-md-list">
                    {items.map((item, idx) => <li key={idx}>{renderInline(item, `ul-${blockIndex}-${idx}`)}</li>)}
                </ul>
            )
            continue
        }

        if (/^\s*\d+[.)]\s+/.test(line)) {
            const items = []
            while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
                items.push(lines[i].replace(/^\s*\d+[.)]\s+/, ''))
                i += 1
            }
            blockIndex += 1
            blocks.push(
                <ol key={`ol-${blockIndex}`} className="epsilon-md-list">
                    {items.map((item, idx) => <li key={idx}>{renderInline(item, `ol-${blockIndex}-${idx}`)}</li>)}
                </ol>
            )
            continue
        }

        if (line.trim() === '') {
            i += 1
            continue
        }

        const paraLines = []
        while (i < lines.length && lines[i].trim() !== '' && !/^\s*[-*]\s+/.test(lines[i]) && !/^\s*\d+[.)]\s+/.test(lines[i])) {
            paraLines.push(lines[i])
            i += 1
        }
        blockIndex += 1
        blocks.push(
            <p key={`p-${blockIndex}`} className="epsilon-md-p">
                {paraLines.map((l, idx) => (
                    <React.Fragment key={idx}>
                        {idx > 0 && <br />}
                        {renderInline(l, `p-${blockIndex}-${idx}`)}
                    </React.Fragment>
                ))}
            </p>
        )
    }

    return blocks
}

export default renderMarkdownLite
