/* ============================================================================
   Inline markup for blog prose.
   ----------------------------------------------------------------------------
   A deliberately tiny subset of Markdown, parsed into React elements rather
   than HTML. Nothing here ever produces a string that gets handed to
   dangerouslySetInnerHTML, so a post body cannot inject markup into the page
   however it was authored or wherever it arrived from. That matters more than
   usual here, because once the central admin is live these strings are
   operator input rather than committed source.

   Supported:
     **bold**
     *italic*
     [label](https://example.com)   external links get rel and target
     [label](/internal/path)        internal links route without a reload
     [^sourceId]                    numbered citation, links to the reference
                                    list, which is built from the ids a post
                                    actually used rather than from the registry

   Anything else is literal text. There is no escape syntax because the cost of
   one is more confusion than it saves: prose that genuinely needs a literal
   double asterisk is rarer than prose that has one by accident.
   ========================================================================= */

import { Fragment } from 'react'

/* One pass, four alternatives, longest-first so ** wins over *. */
const TOKEN = /(\*\*[^*]+\*\*|\*[^*\n]+\*|\[\^[A-Za-z0-9_-]+\]|\[[^\]]+\]\([^)\s]+\))/g

const isExternal = (href) => /^(https?:)?\/\//.test(href) || href.startsWith('mailto:')

/**
 * @param text      the raw string
 * @param refIndex  { sourceId: number }, built per post from its references
 * @param navigate  react-router navigate, for internal links
 */
export const renderInline = (text, refIndex = {}, navigate) => {
  const source = String(text == null ? '' : text)
  const out = []
  let last = 0
  let match
  let key = 0

  TOKEN.lastIndex = 0
  while ((match = TOKEN.exec(source)) !== null) {
    if (match.index > last) out.push(source.slice(last, match.index))
    const token = match[0]

    if (token.startsWith('**')) {
      out.push(<strong key={key++}>{token.slice(2, -2)}</strong>)
    } else if (token.startsWith('[^')) {
      const id = token.slice(2, -1)
      const number = refIndex[id]
      // An unknown id means the post cited something it did not list. Drop the
      // marker rather than printing a broken one at the reader.
      if (number) {
        out.push(
          <sup key={key++} className="blog-cite">
            <a href={`#ref-${number}`} aria-label={`Reference ${number}`}>{number}</a>
          </sup>
        )
      }
    } else if (token.startsWith('[')) {
      const split = token.indexOf('](')
      const label = token.slice(1, split)
      const href = token.slice(split + 2, -1)
      if (isExternal(href)) {
        out.push(
          <a key={key++} href={href} target="_blank" rel="noopener noreferrer nofollow">{label}</a>
        )
      } else if (navigate) {
        out.push(
          <button key={key++} type="button" className="blog-inline-link" onClick={() => navigate(href)}>
            {label}
          </button>
        )
      } else {
        out.push(<a key={key++} href={href}>{label}</a>)
      }
    } else {
      out.push(<em key={key++}>{token.slice(1, -1)}</em>)
    }
    last = match.index + token.length
  }
  if (last < source.length) out.push(source.slice(last))

  return out.map((node, index) =>
    typeof node === 'string' ? <Fragment key={`t${index}`}>{node}</Fragment> : node
  )
}

/**
 * Citation ids in the order a post first uses them, so the numbering follows
 * the reading order rather than the order someone happened to list them in.
 * Falls back to the declared order for anything cited nowhere in the body,
 * which keeps "further reading" entries working.
 */
export const buildReferenceIndex = (post) => {
  const declared = Array.isArray(post && post.references) ? post.references : []
  if (!declared.length) return { order: [], index: {} }

  const seen = []
  const walk = (value) => {
    if (typeof value === 'string') {
      const pattern = /\[\^([A-Za-z0-9_-]+)\]/g
      let hit
      while ((hit = pattern.exec(value)) !== null) {
        if (declared.includes(hit[1]) && !seen.includes(hit[1])) seen.push(hit[1])
      }
      return
    }
    if (Array.isArray(value)) { value.forEach(walk); return }
    if (value && typeof value === 'object') { Object.values(value).forEach(walk) }
  }
  walk(post.body)

  const order = [...seen, ...declared.filter((id) => !seen.includes(id))]
  const index = {}
  order.forEach((id, i) => { index[id] = i + 1 })
  return { order, index }
}

/** Plain text of a block, for reading-time and search. */
export const blockText = (block) => {
  if (!block) return ''
  const parts = []
  if (block.text) parts.push(block.text)
  if (block.title) parts.push(block.title)
  if (Array.isArray(block.items)) {
    block.items.forEach((item) => {
      if (typeof item === 'string') parts.push(item)
      else if (item) parts.push([item.title, item.text].filter(Boolean).join(' '))
    })
  }
  if (Array.isArray(block.rows)) block.rows.forEach((row) => parts.push(row.join(' ')))
  return parts.join(' ')
}

/** Words per minute is a convention rather than a measurement. 225 is typical. */
export const readingMinutes = (post) => {
  if (!post || !Array.isArray(post.body)) return 1
  const words = post.body.reduce((total, block) => total + blockText(block).split(/\s+/).filter(Boolean).length, 0)
  return Math.max(1, Math.round(words / 225))
}

/** h2 blocks become the contents list. h3 is intentionally excluded: a two
    level contents list on a 2,000 word article is noise. */
export const headingsOf = (post) => {
  if (!post || !Array.isArray(post.body)) return []
  return post.body
    .map((block, index) => ({ block, index }))
    .filter(({ block }) => block.t === 'h2')
    .map(({ block, index }) => ({ id: `s${index}`, text: block.text }))
}

export default renderInline
