/* ============================================================================
   Central admin: blog authoring and theming.
   ----------------------------------------------------------------------------
   Its own component rather than another branch inside CentralAdminApp, which
   is already long enough that adding a few hundred lines of editor to it would
   make the whole file harder to work in.

   The editor writes the same block schema the public page renders, so what is
   composed here is what appears. Block bodies are plain text fields: the list,
   table and step types take one item per line, which is a far smaller thing to
   learn than a rich text editor and avoids the usual problem of pasted markup
   carrying styling into the page.

   The server validates everything again on receipt. Nothing in this file is a
   security control; it is a convenience so the operator finds out about a
   problem before saving rather than after.
   ========================================================================= */

import { useState, useEffect, useCallback } from 'react'
import { PILLARS } from '../LandingPage/content/blog/pillars'
import { AUTHORS } from '../LandingPage/content/blog/authors'
import { SOURCES } from '../LandingPage/content/blog/sources'
import { imageNames } from '../LandingPage/ds/landingImages'

const BLOCK_LABELS = {
  p: 'Paragraph',
  h2: 'Heading',
  h3: 'Sub-heading',
  ul: 'Bulleted list',
  ol: 'Numbered list',
  quote: 'Quotation',
  pull: 'Pull quote',
  image: 'Image',
  callout: 'Callout box',
  table: 'Table',
  takeaways: 'Takeaways box',
  steps: 'Numbered steps',
  note: 'Small note',
  divider: 'Divider',
  aside: 'Product note',
}

const emptyPost = () => ({
  slug: '',
  title: '',
  pillar: 'numbers',
  excerpt: '',
  image: 'businessOffice',
  date: new Date().toISOString().slice(0, 10),
  author: 'editorial',
  featured: false,
  references: [],
  status: 'draft',
  body: [{ t: 'p', text: '' }],
})

/* ---- text <-> structure helpers for the list-shaped blocks ------------- */

const linesToItems = (text) => text.split('\n').map((l) => l.trim()).filter(Boolean)
const itemsToLines = (items = []) => items.map((i) => (typeof i === 'string' ? i : '')).join('\n')

const linesToSteps = (text) =>
  linesToItems(text).map((line) => {
    const split = line.indexOf('::')
    return split === -1
      ? { title: line, text: '' }
      : { title: line.slice(0, split).trim(), text: line.slice(split + 2).trim() }
  })
const stepsToLines = (items = []) =>
  items.map((s) => (s && s.title ? `${s.title} :: ${s.text || ''}` : '')).join('\n')

const linesToRows = (text) => linesToItems(text).map((line) => line.split('|').map((c) => c.trim()))
const rowsToLines = (rows = []) => rows.map((row) => row.join(' | ')).join('\n')

const BlockEditor = ({ block, onChange }) => {
  const set = (patch) => onChange({ ...block, ...patch })

  switch (block.t) {
    case 'divider':
      return <p className="cab-hint">A horizontal rule. Nothing to configure.</p>

    case 'image':
      return (
        <div className="cab-row">
          <label>
            Image
            <select value={block.name || ''} onChange={(e) => set({ name: e.target.value })}>
              {imageNames.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          </label>
          <label>
            Caption
            <input value={block.caption || ''} onChange={(e) => set({ caption: e.target.value })} />
          </label>
        </div>
      )

    case 'callout':
      return (
        <>
          <div className="cab-row">
            <label>
              Tone
              <select value={block.tone || 'info'} onChange={(e) => set({ tone: e.target.value })}>
                <option value="info">Info</option>
                <option value="warn">Warning</option>
                <option value="idea">Idea</option>
              </select>
            </label>
            <label>
              Title
              <input value={block.title || ''} onChange={(e) => set({ title: e.target.value })} />
            </label>
          </div>
          <textarea rows={3} value={block.text || ''} onChange={(e) => set({ text: e.target.value })} />
        </>
      )

    case 'aside':
      return (
        <>
          <div className="cab-row">
            <label>
              Title
              <input value={block.title || ''} onChange={(e) => set({ title: e.target.value })} />
            </label>
            <label>
              Links to (internal path)
              <input value={block.to || ''} onChange={(e) => set({ to: e.target.value })} placeholder="/products/pos" />
            </label>
          </div>
          <textarea rows={3} value={block.text || ''} onChange={(e) => set({ text: e.target.value })} />
          <p className="cab-hint">Rendered as a clearly labelled product note, separate from the article.</p>
        </>
      )

    case 'ul':
    case 'ol':
    case 'takeaways':
      return (
        <>
          <textarea
            rows={5}
            value={itemsToLines(block.items)}
            onChange={(e) => set({ items: linesToItems(e.target.value) })}
          />
          <p className="cab-hint">One item per line.</p>
        </>
      )

    case 'steps':
      return (
        <>
          <textarea
            rows={5}
            value={stepsToLines(block.items)}
            onChange={(e) => set({ items: linesToSteps(e.target.value) })}
          />
          <p className="cab-hint">One step per line, as <code>Title :: description</code>.</p>
        </>
      )

    case 'table':
      return (
        <>
          <label>
            Header row
            <input
              value={(block.head || []).join(' | ')}
              onChange={(e) => set({ head: e.target.value.split('|').map((c) => c.trim()) })}
              placeholder="Column one | Column two"
            />
          </label>
          <textarea
            rows={5}
            value={rowsToLines(block.rows)}
            onChange={(e) => set({ rows: linesToRows(e.target.value) })}
          />
          <p className="cab-hint">One row per line, cells separated by a vertical bar.</p>
        </>
      )

    case 'quote':
      return (
        <>
          <textarea rows={3} value={block.text || ''} onChange={(e) => set({ text: e.target.value })} />
          <label>
            Attribution
            <input value={block.cite || ''} onChange={(e) => set({ cite: e.target.value })} />
          </label>
        </>
      )

    default:
      return (
        <textarea
          rows={block.t === 'p' ? 5 : 2}
          value={block.text || ''}
          onChange={(e) => set({ text: e.target.value })}
        />
      )
  }
}

const BlogAdminPanel = ({ requestAdmin, setNotice }) => {
  const [posts, setPosts] = useState([])
  const [draft, setDraft] = useState(null)
  const [theme, setTheme] = useState({})
  const [options, setOptions] = useState({})
  const [flags, setFlags] = useState([])
  const [busy, setBusy] = useState(false)
  const [view, setView] = useState('posts')

  const load = useCallback(async () => {
    setBusy(true)
    try {
      const [postsResponse, themeResponse] = await Promise.all([
        requestAdmin('GET', 'central-admin/blog/posts'),
        requestAdmin('GET', 'central-admin/blog/theme'),
      ])
      if (postsResponse.ok) setPosts(postsResponse.posts || [])
      if (themeResponse.ok) {
        setTheme(themeResponse.theme || {})
        setOptions(themeResponse.options || {})
        setFlags(themeResponse.flags || [])
      }
    } catch (error) {
      setNotice('error', 'Could not load the blog.')
    } finally {
      setBusy(false)
    }
  }, [requestAdmin, setNotice])

  useEffect(() => { load() }, [load])

  const savePost = async () => {
    if (!draft) return
    setBusy(true)
    const response = await requestAdmin('POST', 'central-admin/blog/posts', { post: draft })
    setBusy(false)
    if (!response.ok) { setNotice('error', response.error || 'Could not save.'); return }
    setNotice('success', `Saved "${draft.title}".`)
    setDraft(null)
    load()
  }

  const setStatus = async (slug, status) => {
    const response = await requestAdmin('POST', `central-admin/blog/posts/${slug}/status`, { status })
    if (!response.ok) { setNotice('error', response.error || 'Could not change status.'); return }
    setNotice('success', status === 'published' ? 'Published.' : 'Moved to draft.')
    load()
  }

  const removePost = async (slug) => {
    if (!window.confirm(`Permanently delete "${slug}"? This cannot be undone.`)) return
    const response = await requestAdmin('DELETE', `central-admin/blog/posts/${slug}`)
    if (!response.ok) { setNotice('error', response.error || 'Could not delete.'); return }
    setNotice('success', 'Deleted.')
    load()
  }

  const saveTheme = async () => {
    setBusy(true)
    const response = await requestAdmin('POST', 'central-admin/blog/theme', { theme })
    setBusy(false)
    if (!response.ok) { setNotice('error', response.error || 'Could not save the theme.'); return }
    setNotice('success', 'Appearance saved. The public blog picks it up within five minutes.')
  }

  /* ---- block manipulation ---- */
  const updateBlock = (index, next) => {
    const body = [...draft.body]
    body[index] = next
    setDraft({ ...draft, body })
  }
  const addBlock = (type) => setDraft({ ...draft, body: [...draft.body, { t: type }] })
  const removeBlock = (index) =>
    setDraft({ ...draft, body: draft.body.filter((_, i) => i !== index) })
  const moveBlock = (index, delta) => {
    const target = index + delta
    if (target < 0 || target >= draft.body.length) return
    const body = [...draft.body]
    const [item] = body.splice(index, 1)
    body.splice(target, 0, item)
    setDraft({ ...draft, body })
  }

  return (
    <div className="cab">
      <div className="cab-tabs">
        <button className={view === 'posts' ? 'active' : ''} onClick={() => setView('posts')}>Posts</button>
        <button className={view === 'theme' ? 'active' : ''} onClick={() => setView('theme')}>Appearance</button>
      </div>

      {view === 'posts' && !draft && (
        <>
          <div className="cab-bar">
            <button className="cab-primary" onClick={() => setDraft(emptyPost())}>New post</button>
            <button onClick={load} disabled={busy}>{busy ? 'Loading...' : 'Refresh'}</button>
          </div>
          <p className="cab-hint">
            Posts written here are added to the blog alongside the set that ships with the site.
            A post that uses the same address as one of those replaces it. If this list is empty,
            the blog is running entirely on the content shipped with the build, which is the
            intended fallback rather than a fault.
          </p>
          <table className="cab-table">
            <thead>
              <tr><th>Title</th><th>Topic</th><th>Date</th><th>Status</th><th /></tr>
            </thead>
            <tbody>
              {posts.length === 0 && (
                <tr><td colSpan={5} className="cab-empty">Nothing written here yet.</td></tr>
              )}
              {posts.map((post) => (
                <tr key={post.slug}>
                  <td>{post.title}</td>
                  <td>{post.pillar}</td>
                  <td>{post.date}</td>
                  <td>
                    <span className={`cab-pill ${post.status}`}>{post.status}</span>
                  </td>
                  <td className="cab-actions">
                    <button onClick={() => setDraft({ ...emptyPost(), ...post })}>Edit</button>
                    <button onClick={() => setStatus(post.slug, post.status === 'published' ? 'draft' : 'published')}>
                      {post.status === 'published' ? 'Unpublish' : 'Publish'}
                    </button>
                    <button className="cab-danger" onClick={() => removePost(post.slug)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {view === 'posts' && draft && (
        <div className="cab-editor">
          <div className="cab-bar">
            <button onClick={() => setDraft(null)}>Back</button>
            <button className="cab-primary" onClick={savePost} disabled={busy}>
              {busy ? 'Saving...' : 'Save'}
            </button>
          </div>

          <div className="cab-row">
            <label>
              Title
              <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            </label>
            <label>
              Address (lowercase, hyphens)
              <input value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} placeholder="margin-is-not-markup" />
            </label>
          </div>

          <label>
            Standfirst
            <textarea rows={2} value={draft.excerpt} onChange={(e) => setDraft({ ...draft, excerpt: e.target.value })} />
          </label>

          <div className="cab-row">
            <label>
              Topic
              <select value={draft.pillar} onChange={(e) => setDraft({ ...draft, pillar: e.target.value })}>
                {PILLARS.map((p) => <option key={p.key} value={p.key}>{p.name}</option>)}
              </select>
            </label>
            <label>
              Byline
              <select value={draft.author} onChange={(e) => setDraft({ ...draft, author: e.target.value })}>
                {Object.values(AUTHORS).map((a) => <option key={a.key} value={a.key}>{a.role}</option>)}
              </select>
            </label>
            <label>
              Date
              <input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
            </label>
          </div>

          <div className="cab-row">
            <label>
              Lead image
              <select value={draft.image} onChange={(e) => setDraft({ ...draft, image: e.target.value })}>
                {imageNames.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
            </label>
            <label className="cab-check">
              <input type="checkbox" checked={!!draft.featured} onChange={(e) => setDraft({ ...draft, featured: e.target.checked })} />
              Eligible to lead the index
            </label>
            <label>
              Status
              <select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </label>
          </div>

          <label>
            Sources cited
            <select
              multiple
              size={6}
              value={draft.references}
              onChange={(e) => setDraft({
                ...draft,
                references: [...e.target.selectedOptions].map((o) => o.value),
              })}
            >
              {Object.values(SOURCES).map((s) => (
                <option key={s.id} value={s.id}>{s.title}</option>
              ))}
            </select>
          </label>
          <p className="cab-hint">
            Cite one in the text by writing <code>[^sourceId]</code> where the reference belongs.
            Numbering follows the order they first appear, and the list at the foot of the article
            is built from the sources actually used.
          </p>

          <h4 className="cab-section">Content</h4>
          {draft.body.map((block, index) => (
            <div className="cab-block" key={index}>
              <div className="cab-block-head">
                <select value={block.t} onChange={(e) => updateBlock(index, { t: e.target.value })}>
                  {Object.keys(BLOCK_LABELS).map((t) => (
                    <option key={t} value={t}>{BLOCK_LABELS[t]}</option>
                  ))}
                </select>
                <div className="cab-actions">
                  <button onClick={() => moveBlock(index, -1)} disabled={index === 0}>Up</button>
                  <button onClick={() => moveBlock(index, 1)} disabled={index === draft.body.length - 1}>Down</button>
                  <button className="cab-danger" onClick={() => removeBlock(index)}>Remove</button>
                </div>
              </div>
              <BlockEditor block={block} onChange={(next) => updateBlock(index, next)} />
            </div>
          ))}

          <div className="cab-bar cab-add">
            <span>Add:</span>
            {Object.keys(BLOCK_LABELS).map((t) => (
              <button key={t} onClick={() => addBlock(t)}>{BLOCK_LABELS[t]}</button>
            ))}
          </div>
        </div>
      )}

      {view === 'theme' && (
        <div className="cab-editor">
          <p className="cab-hint">
            These choices drive the public blog. They are a fixed set rather than free styling,
            so nothing selected here can break the page or affect the rest of the site.
          </p>

          <div className="cab-row cab-wrap">
            {Object.keys(options).map((key) => (
              <label key={key}>
                {key}
                <select
                  value={theme[key] || options[key][0]}
                  onChange={(e) => setTheme({ ...theme, [key]: e.target.value })}
                >
                  {options[key].map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
              </label>
            ))}
          </div>

          <h4 className="cab-section">Show or hide</h4>
          <div className="cab-row cab-wrap">
            {flags.map((flag) => (
              <label key={flag} className="cab-check">
                <input
                  type="checkbox"
                  checked={theme[flag] !== false}
                  onChange={(e) => setTheme({ ...theme, [flag]: e.target.checked })}
                />
                {flag.replace(/^show/, '')}
              </label>
            ))}
          </div>

          <h4 className="cab-section">Index heading</h4>
          <div className="cab-row">
            <label>
              Eyebrow
              <input
                value={(theme.intro && theme.intro.eyebrow) || ''}
                onChange={(e) => setTheme({ ...theme, intro: { ...theme.intro, eyebrow: e.target.value } })}
              />
            </label>
            <label>
              Title
              <input
                value={(theme.intro && theme.intro.title) || ''}
                onChange={(e) => setTheme({ ...theme, intro: { ...theme.intro, title: e.target.value } })}
              />
            </label>
          </div>
          <label>
            Standfirst
            <textarea
              rows={2}
              value={(theme.intro && theme.intro.lede) || ''}
              onChange={(e) => setTheme({ ...theme, intro: { ...theme.intro, lede: e.target.value } })}
            />
          </label>

          <label>
            Lead article (address of the post to pin)
            <input
              value={theme.featuredSlug || ''}
              onChange={(e) => setTheme({ ...theme, featuredSlug: e.target.value })}
              placeholder="Leave empty to use the newest eligible post"
            />
          </label>

          <div className="cab-bar">
            <button className="cab-primary" onClick={saveTheme} disabled={busy}>
              {busy ? 'Saving...' : 'Save appearance'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default BlogAdminPanel
