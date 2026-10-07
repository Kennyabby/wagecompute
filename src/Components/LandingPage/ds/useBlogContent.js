/* ============================================================================
   Blog content loader.
   ----------------------------------------------------------------------------
   Returns the theme and the posts, preferring whatever the central admin has
   published and falling back to the content shipped in content/blog.

   The fallback is the important part. A content site that renders nothing when
   a request fails is worse than one that is occasionally a few hours stale,
   and this blog also has to work during a production build, inside the desktop
   package, and for a crawler that will not wait. So the committed content
   renders immediately on first paint and is replaced only once a response has
   arrived and been checked.

   Everything from the API is treated as untrusted: the theme is filtered down
   to known keys with known values, and post bodies are rendered through the
   block renderer, which builds React elements rather than HTML. An operator
   cannot inject markup into the page through the editor.
   ========================================================================= */

import { useState, useEffect, useContext, useMemo } from 'react'
import ContextProvider from '../../../Resources/ContextProvider'
import { POSTS as DEFAULT_POSTS, DEFAULT_THEME, THEME_OPTIONS } from '../content/blog'

/** Keep only keys we know, and only values we offer. Anything else falls back. */
const sanitiseTheme = (incoming) => {
  const theme = { ...DEFAULT_THEME }
  if (!incoming || typeof incoming !== 'object') return theme

  Object.keys(THEME_OPTIONS).forEach((key) => {
    if (THEME_OPTIONS[key].includes(incoming[key])) theme[key] = incoming[key]
  })
  Object.keys(DEFAULT_THEME).forEach((key) => {
    if (typeof DEFAULT_THEME[key] === 'boolean' && typeof incoming[key] === 'boolean') {
      theme[key] = incoming[key]
    }
  })
  if (typeof incoming.featuredSlug === 'string') theme.featuredSlug = incoming.featuredSlug
  if (Array.isArray(incoming.pinned)) theme.pinned = incoming.pinned.filter((s) => typeof s === 'string')
  if (incoming.intro && typeof incoming.intro === 'object') {
    theme.intro = {
      eyebrow: typeof incoming.intro.eyebrow === 'string' ? incoming.intro.eyebrow : DEFAULT_THEME.intro.eyebrow,
      title: typeof incoming.intro.title === 'string' ? incoming.intro.title : DEFAULT_THEME.intro.title,
      lede: typeof incoming.intro.lede === 'string' ? incoming.intro.lede : DEFAULT_THEME.intro.lede,
    }
  }
  return theme
}

/** A post is only usable if it has the fields the renderer needs. */
const isRenderable = (post) =>
  post &&
  typeof post.slug === 'string' &&
  typeof post.title === 'string' &&
  Array.isArray(post.body)

const byNewest = (a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)

export const useBlogContent = () => {
  const { server } = useContext(ContextProvider)
  const [remote, setRemote] = useState(null)

  useEffect(() => {
    if (!server) return undefined
    let live = true

    fetch(`${server}/public/blog`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!live || !data) return
        setRemote(data)
      })
      .catch(() => {
        // Offline, blocked, or the endpoint is not deployed yet. The shipped
        // content is already on screen, so there is nothing to recover from
        // and nothing worth showing the reader.
      })

    return () => { live = false }
  }, [server])

  const theme = useMemo(() => sanitiseTheme(remote && remote.theme), [remote])

  const posts = useMemo(() => {
    const incoming = remote && Array.isArray(remote.posts) ? remote.posts.filter(isRenderable) : []
    // An empty or unusable payload keeps the defaults rather than emptying the
    // blog, which is the failure mode that would matter most.
    if (!incoming.length) return DEFAULT_POSTS
    // Published posts replace a default of the same slug; the rest of the
    // committed set stays, so the admin adds to the blog without having to
    // re-enter everything already written.
    const bySlug = new Map(DEFAULT_POSTS.map((post) => [post.slug, post]))
    incoming.forEach((post) => bySlug.set(post.slug, post))
    return [...bySlug.values()].sort(byNewest)
  }, [remote])

  return { theme, posts, loadedFromServer: !!remote }
}

export default useBlogContent
