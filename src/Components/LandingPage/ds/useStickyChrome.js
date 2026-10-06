/* ============================================================================
   Sticky chrome controller: measures the secondary nav and hides it on the
   way down the page.
   ----------------------------------------------------------------------------
   Two jobs, both of which have to be done from JavaScript.

   1. MEASURE.
      Everything that sticks below the chrome (the rail headings, the docs
      sidebar, the ROI result card, anchor scrolling) needs to know how tall
      the chrome actually is. That was a hardcoded `--ds-subnav-h: 56px`,
      which is the height of the tab strip alone. The secondary nav also
      renders a breadcrumb row above those tabs, so the real element is
      closer to 96px, and every offset built on the constant was ~40px
      short. That is what pushed rail headings up underneath the bar and
      clipped them.

      Rather than hardcode a bigger number, which breaks again the moment a
      page has no breadcrumbs or the tabs wrap, the element is measured with
      a ResizeObserver and the result published as a custom property. Pages
      with no secondary nav at all report 0 and their offsets collapse on
      their own.

   2. HIDE ON THE WAY DOWN.
      Scrolling down hides the bar, scrolling up brings it back, and it is
      always present at the top of the page. While it is hidden the offsets
      collapse to the header alone, so the content that sticks underneath
      moves up into the freed space instead of leaving a gap. Nothing is
      covered in either direction, because the offset always matches what is
      actually on screen.

   Published properties, both on <html>:
     --ds-subnav-h      measured height of the bar, whether or not it is shown
     --ds-chrome-top    header + the part of the bar currently on screen
   ========================================================================= */

import { useEffect } from 'react'

/* Scroll past this much before the bar is allowed to hide at all, so a short
   page or a small nudge near the top never takes it away. */
const ENGAGE_AFTER = 120

/* Ignore direction changes smaller than this. Without it, the sub-pixel
   jitter a trackpad produces at rest flickers the bar on and off. */
const DIRECTION_THRESHOLD = 6

export const useStickyChrome = () => {
  useEffect(() => {
    const root = document.documentElement

    const getSubnav = () => document.querySelector('.ds-subnav')

    const headerHeight = () => {
      const header = document.querySelector('.ds-header')
      return header ? Math.round(header.getBoundingClientRect().height) : 64
    }

    let subnavHeight = 0
    let hidden = false

    const publish = () => {
      root.style.setProperty('--ds-subnav-h', subnavHeight + 'px')
      root.style.setProperty(
        '--ds-chrome-top',
        headerHeight() + (hidden ? 0 : subnavHeight) + 'px'
      )
    }

    const measure = () => {
      const el = getSubnav()
      // A transform does not change layout, so this still reads the real
      // height while the bar is translated out of view.
      subnavHeight = el ? Math.round(el.getBoundingClientRect().height) : 0
      publish()
    }

    const setHidden = (next) => {
      if (next === hidden) return
      hidden = next
      const el = getSubnav()
      if (el) el.classList.toggle('is-hidden', hidden)
      publish()
    }

    // Someone who has asked for less motion keeps the bar on screen for the
    // whole page. The CSS counterpart only drops the transition; the decision
    // not to hide lives here so the published offsets can never describe a
    // state the bar is not actually in.
    const reduceMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let lastY = window.scrollY
    let frame = null

    const onScrollFrame = () => {
      frame = null
      if (reduceMotion) return
      const y = window.scrollY
      const delta = y - lastY

      if (Math.abs(delta) < DIRECTION_THRESHOLD) return

      // Near the top the bar always stays, so a short page or a small nudge
      // never takes it away. Below that it simply follows direction: down
      // hides it, up brings it back, including at the very bottom of the
      // page. Scrolling up is how you get it back from there.
      if (y <= ENGAGE_AFTER) setHidden(false)
      else setHidden(delta > 0)

      lastY = y
    }

    const onScroll = () => {
      if (frame === null) frame = requestAnimationFrame(onScrollFrame)
    }

    // A focused control inside the bar must not be scrolled out of reach.
    const onFocusIn = (event) => {
      const el = getSubnav()
      if (el && el.contains(event.target)) setHidden(false)
    }

    measure()

    let observer = null
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(measure)
      const el = getSubnav()
      if (el) observer.observe(el)
      // The header can change height too (it is sticky, not fixed).
      const header = document.querySelector('.ds-header')
      if (header) observer.observe(header)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', measure)
    document.addEventListener('focusin', onFocusIn)

    return () => {
      if (frame !== null) cancelAnimationFrame(frame)
      if (observer) observer.disconnect()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', measure)
      document.removeEventListener('focusin', onFocusIn)
      // Leave the page in a clean state for whatever renders next.
      const el = getSubnav()
      if (el) el.classList.remove('is-hidden')
      root.style.removeProperty('--ds-subnav-h')
      root.style.removeProperty('--ds-chrome-top')
    }
  }, [])
}

export default useStickyChrome
