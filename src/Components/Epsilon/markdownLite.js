// A small, dependency-free markdown-lite renderer for Epsilon's replies —
// handles the things a model actually produces in a chat answer (bold,
// italic, inline code, bullet/numbered lists, paragraphs, fenced code
// blocks, GFM pipe tables, and a small fixed set of semantic callouts/inline
// colors — see SYSTEM_PROMPT's "Formatting" rule in epsilon.js for the exact
// syntax taught to the model) without pulling in a full markdown library.
// Deliberately returns React elements built from plain text, never
// dangerouslySetInnerHTML — model output is never trusted as raw HTML.
import React, { useState } from 'react'

// Fixed, finite set — never arbitrary CSS/colors from model text. Anything
// outside this set is left as plain text rather than guessed at.
const CALLOUT_TYPES = new Set(['success', 'warning', 'error', 'info'])

const CodeBlock = ({ code, lang }) => {
    const [copied, setCopied] = useState(false)
    const handleCopy = () => {
        try {
            navigator.clipboard.writeText(code)
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
        } catch (e) { /* clipboard unavailable — silently no-op */ }
    }
    return (
        <div className="epsilon-md-pre-wrap">
            <div className="epsilon-md-pre-head">
                <span className="epsilon-md-pre-lang">{lang || 'text'}</span>
                <button className="epsilon-md-pre-copy" onClick={handleCopy} type="button">{copied ? 'Copied' : 'Copy'}</button>
            </div>
            <pre className="epsilon-md-pre"><code>{code}</code></pre>
        </div>
    )
}

const renderInline = (text, keyPrefix) => {
    // Split on **bold**, *italic*/_italic_, `code`, and [[type:text]] inline
    // callouts — order matters so ** is matched before single *.
    const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*|_[^_]+_|\[\[(?:success|warning|error|info):[^\]]+\]\])/g
    const parts = text.split(pattern).filter((p) => p !== '')
    return parts.map((part, i) => {
        const key = `${keyPrefix}-${i}`
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={key}>{part.slice(2, -2)}</strong>
        }
        if (part.startsWith('`') && part.endsWith('`')) {
            return <code key={key} className="epsilon-inline-code">{part.slice(1, -1)}</code>
        }
        const inlineCallout = part.match(/^\[\[(success|warning|error|info):([^\]]+)\]\]$/)
        if (inlineCallout) {
            return <span key={key} className={`epsilon-inline-callout epsilon-inline-${inlineCallout[1]}`}>{inlineCallout[2]}</span>
        }
        if ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_'))) {
            return <em key={key}>{part.slice(1, -1)}</em>
        }
        return <React.Fragment key={key}>{part}</React.Fragment>
    })
}

// A GFM pipe table's header separator row: |---|:---:|---:| etc.
const isTableSeparatorLine = (line) => /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*$/.test(line)

const parseTableRow = (line) => {
    const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '')
    // Splits on unescaped pipes only — a literal `\|` inside a cell stays intact.
    return trimmed.split(/(?<!\\)\|/).map((cell) => cell.trim().replace(/\\\|/g, '|'))
}

const renderMarkdownLite = (text) => {
    const lines = String(text || '').split('\n')
    const blocks = []
    let i = 0
    let blockIndex = 0

    while (i < lines.length) {
        const line = lines[i]

        // Fenced code block: ```lang ... ```
        const fenceMatch = line.match(/^\s*```(\S*)\s*$/)
        if (fenceMatch) {
            const lang = fenceMatch[1] || ''
            const codeLines = []
            i += 1
            while (i < lines.length && !/^\s*```\s*$/.test(lines[i])) {
                codeLines.push(lines[i])
                i += 1
            }
            if (i < lines.length) i += 1 // consume the closing fence
            blockIndex += 1
            blocks.push(<CodeBlock key={`code-${blockIndex}`} code={codeLines.join('\n')} lang={lang} />)
            continue
        }

        // Semantic callout block: :::warning ... :::
        const calloutMatch = line.match(/^\s*:::(success|warning|error|info)\s*$/)
        if (calloutMatch) {
            const type = calloutMatch[1]
            const bodyLines = []
            i += 1
            while (i < lines.length && lines[i].trim() !== ':::') {
                bodyLines.push(lines[i])
                i += 1
            }
            if (i < lines.length) i += 1 // consume the closing :::
            blockIndex += 1
            blocks.push(
                <div key={`callout-${blockIndex}`} className={`epsilon-callout epsilon-callout-${type}`}>
                    {bodyLines.map((l, idx) => (
                        <React.Fragment key={idx}>
                            {idx > 0 && <br />}
                            {renderInline(l, `callout-${blockIndex}-${idx}`)}
                        </React.Fragment>
                    ))}
                </div>
            )
            continue
        }

        // GFM pipe table: a row containing '|', immediately followed by a
        // separator row, then zero or more further rows.
        if (line.includes('|') && i + 1 < lines.length && isTableSeparatorLine(lines[i + 1])) {
            const headerCells = parseTableRow(line)
            i += 2 // header + separator
            const rows = []
            while (i < lines.length && lines[i].trim() !== '' && lines[i].includes('|')) {
                rows.push(parseTableRow(lines[i]))
                i += 1
            }
            blockIndex += 1
            blocks.push(
                <div className="epsilon-md-table-wrap" key={`table-${blockIndex}`}>
                    <table className="epsilon-md-table">
                        <thead>
                            <tr>{headerCells.map((cell, idx) => <th key={idx}>{renderInline(cell, `th-${blockIndex}-${idx}`)}</th>)}</tr>
                        </thead>
                        <tbody>
                            {rows.map((row, rIdx) => (
                                <tr key={rIdx}>{row.map((cell, cIdx) => <td key={cIdx}>{renderInline(cell, `td-${blockIndex}-${rIdx}-${cIdx}`)}</td>)}</tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )
            continue
        }

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
        while (
            i < lines.length && lines[i].trim() !== ''
            && !/^\s*[-*]\s+/.test(lines[i]) && !/^\s*\d+[.)]\s+/.test(lines[i])
            && !/^\s*```/.test(lines[i]) && !/^\s*:::(success|warning|error|info)\s*$/.test(lines[i])
            && !(lines[i].includes('|') && i + 1 < lines.length && isTableSeparatorLine(lines[i + 1]))
        ) {
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
