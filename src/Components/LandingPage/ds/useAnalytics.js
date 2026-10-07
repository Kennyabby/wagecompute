/* ============================================================================
   Public-site analytics.
   ----------------------------------------------------------------------------
   Records which pages get read and for how long, so the blog can be judged on
   something other than a feeling. Runs on every public page through PageShell.

   WHAT IS MEASURED
   A view when a route mounts, then a duration when the reader leaves it. The
   duration counts only the time the tab was actually visible, because wall
   clock time counts the twenty minutes someone left the tab open behind their
   email client and would make every number meaningless.

   WHAT IS NOT COLLECTED
   No name, no email, no account id, no IP stored against the record, and no
   cross-site identifier. The visitor id is a random string in this browser's
   local storage and means only "the same browser came back". Do Not Track is
   honoured, and if storage is unavailable the page still works and simply is
   not counted.

   DELIVERY
   The closing event uses sendBeacon, which the browser is allowed to finish
   after the page is gone. A normal fetch at unload is routinely cancelled,
   which is why time-on-page is missing from so many home-grown trackers.
   ========================================================================= */

import { useEffect, useRef, useContext } from 'react'
import { useLocation } from 'react-router-dom'
import ContextProvider from '../../../Resources/ContextProvider'

const VISITOR_KEY = 'ec_visitor_id'
const SESSION_KEY = 'ec_session_id'

/* Below this, a view is someone bouncing through on their way somewhere else
   and the duration tells you nothing. */
const MIN_REPORTABLE_MS = 1000

const randomId = () => {
  try {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID()
  } catch (error) { /* fall through to the cheap version */ }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
}

/** Storage can throw in private mode or when site data is blocked. */
const readStore = (store, key) => {
  try { return store.getItem(key) } catch (error) { return null }
}
const writeStore = (store, key, value) => {
  try { store.setItem(key, value); return true } catch (error) { return false }
}

const identify = () => {
  let visitor = readStore(window.localStorage, VISITOR_KEY)
  if (!visitor) {
    visitor = randomId()
    if (!writeStore(window.localStorage, VISITOR_KEY, visitor)) return null
  }
  let session = readStore(window.sessionStorage, SESSION_KEY)
  if (!session) {
    session = randomId()
    writeStore(window.sessionStorage, SESSION_KEY, session)
  }
  return { visitor, session }
}

const doNotTrack = () => {
  const value = window.doNotTrack || navigator.doNotTrack || navigator.msDoNotTrack
  return value === '1' || value === 'yes'
}

export const usePageAnalytics = (title) => {
  const { server } = useContext(ContextProvider)
  const { pathname } = useLocation()
  const state = useRef(null)

  useEffect(() => {
    if (!server || doNotTrack()) return undefined
    const who = identify()
    if (!who) return undefined

    const send = (body, beacon) => {
      const url = `${server}/public/analytics/collect`
      const payload = JSON.stringify(body)
      try {
        if (beacon && navigator.sendBeacon) {
          // text/plain keeps it a simple request, so no preflight on unload.
          navigator.sendBeacon(url, new Blob([payload], { type: 'text/plain;charset=UTF-8' }))
          return
        }
        fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true,
        }).catch(() => {})
      } catch (error) { /* analytics must never break a page */ }
    }

    const current = {
      path: pathname,
      title: title || document.title,
      startedAt: Date.now(),
      visibleSince: document.visibilityState === 'visible' ? Date.now() : null,
      visibleMs: 0,
      maxScroll: 0,
      sent: false,
    }
    state.current = current

    send({
      kind: 'view',
      path: current.path,
      title: current.title,
      visitor: who.visitor,
      session: who.session,
      referrer: document.referrer || '',
      width: window.innerWidth,
      language: navigator.language || '',
    }, false)

    const accumulate = () => {
      if (current.visibleSince !== null) {
        current.visibleMs += Date.now() - current.visibleSince
        current.visibleSince = null
      }
    }

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        if (current.visibleSince === null) current.visibleSince = Date.now()
      } else {
        accumulate()
        // Hiding the tab may be the last thing that happens, so close the
        // record now rather than hoping for an unload event later.
        finish(true)
      }
    }

    /* How far down the page they actually got, as a percentage. On a long
       article this separates "opened it" from "read it". */
    let frame = null
    const measureScroll = () => {
      frame = null
      const doc = document.documentElement
      const scrollable = doc.scrollHeight - window.innerHeight
      const depth = scrollable > 0 ? Math.min(100, Math.round((window.scrollY / scrollable) * 100)) : 100
      if (depth > current.maxScroll) current.maxScroll = depth
    }
    const onScroll = () => { if (frame === null) frame = requestAnimationFrame(measureScroll) }

    function finish(beacon) {
      if (current.sent) return
      accumulate()
      if (current.visibleMs < MIN_REPORTABLE_MS) return
      current.sent = true
      send({
        kind: 'leave',
        path: current.path,
        title: current.title,
        visitor: who.visitor,
        session: who.session,
        durationMs: current.visibleMs,
        scrollDepth: current.maxScroll,
      }, beacon)
    }

    // Named, so the cleanup can actually remove it. An inline arrow here
    // leaves one listener per route behind for the life of the tab.
    const onPageHide = () => finish(true)

    measureScroll()
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', onPageHide)
    window.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      if (frame !== null) cancelAnimationFrame(frame)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', onPageHide)
      window.removeEventListener('scroll', onScroll)
      // Leaving by clicking an internal link unmounts the route without any
      // unload event, so the record is closed here too.
      finish(false)
    }
  }, [server, pathname, title])
}

export default usePageAnalytics
