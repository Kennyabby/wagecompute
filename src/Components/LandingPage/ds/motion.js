/* ============================================================================
   Motion system for the public pages.
   ----------------------------------------------------------------------------
   Three pieces:

   1. useInView / Reveal, IntersectionObserver-driven entrance animations.
      Elements start slightly down and transparent, and settle as they come
      into view. Children of a revealing container stagger via a CSS custom
      property rather than per-element JavaScript timers, so a grid of twelve
      cards still costs one observer and zero timeouts.

   2. smoothScrollTo, eased programmatic scrolling for anchors and
      back-to-top. The native `scroll-behavior: smooth` is linear and feels
      mechanical over long distances; this uses an ease-in-out curve and
      scales its duration with the distance travelled.

   3. useParallax, a few per cent of drift on hero imagery, for depth.

   What is NOT here is any interception of the wheel. The page scrolls at
   exactly the speed the operating system says it should; see the note
   further down for why that is deliberate.

   Everything here stands down under `prefers-reduced-motion: reduce`.
   ========================================================================= */

import { useEffect, useRef, useState } from 'react'

/* -------------------------------------------------------------- helpers -- */

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

/* ------------------------------------------------------------- in-view --- */

/**
 * Returns [ref, inView]. Fires once and then disconnects, these are
 * entrance animations, not scroll-linked effects, so re-triggering on the
 * way back up would be noise rather than polish.
 */
export const useInView = ({ threshold = 0.12, rootMargin = '0px 0px -8% 0px', once = true } = {}) => {
  const ref = useRef(null)
  const [inView, setInView] = useState(() => prefersReducedMotion())

  useEffect(() => {
    const node = ref.current
    if (!node) return undefined

    // No observer support, or the visitor asked for less motion: show the
    // content immediately rather than leaving it stuck at opacity 0.
    if (prefersReducedMotion() || typeof IntersectionObserver === 'undefined') {
      setInView(true)
      return undefined
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setInView(true)
            if (once) observer.unobserve(entry.target)
          } else if (!once) {
            setInView(false)
          }
        })
      },
      { threshold, rootMargin }
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [threshold, rootMargin, once])

  return [ref, inView]
}

/**
 * Wraps children in an element that animates in when scrolled to.
 *
 * `as`       element to render (default div)
 * `variant`  'up' | 'fade' | 'left' | 'right' | 'scale'
 * `delay`    seconds added before this element's own transition starts
 * `stagger`  when true, direct children animate in sequence
 */
export const Reveal = ({
  as: Tag = 'div',
  variant = 'up',
  delay = 0,
  stagger = false,
  step = 0.07,
  className = '',
  style,
  children,
  ...rest
}) => {
  const [ref, inView] = useInView()

  const classes = [
    'ds-reveal',
    `ds-reveal-${variant}`,
    stagger && 'ds-reveal-stagger',
    inView && 'is-in',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <Tag
      ref={ref}
      className={classes}
      style={{
        ...(delay ? { '--ds-reveal-delay': `${delay}s` } : null),
        ...(stagger ? { '--ds-reveal-step': `${step}s` } : null),
        ...style,
      }}
      {...rest}
    >
      {children}
    </Tag>
  )
}

/* ------------------------------------------------- programmatic scroll --- */

let activeScroll = null

/** Eased scroll to an absolute document offset. */
export const smoothScrollTo = (targetY, { duration } = {}) => {
  if (typeof window === 'undefined') return

  const maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
  const to = Math.max(0, Math.min(targetY, maxY))
  const from = window.scrollY
  const distance = to - from

  if (prefersReducedMotion() || Math.abs(distance) < 2) {
    window.scrollTo(0, to)
    return
  }

  // Scale duration with distance so a short hop is snappy and a long jump
  // does not feel like it is crawling, with sane bounds at both ends.
  const ms = duration ?? Math.min(1100, Math.max(360, Math.abs(distance) * 0.55))

  if (activeScroll) cancelAnimationFrame(activeScroll)
  const start = performance.now()

  const frame = (now) => {
    const progress = Math.min(1, (now - start) / ms)
    window.scrollTo(0, from + distance * easeInOutCubic(progress))
    if (progress < 1) activeScroll = requestAnimationFrame(frame)
    else activeScroll = null
  }

  activeScroll = requestAnimationFrame(frame)
}

/**
 * Eased scroll to an element, clearing the sticky header and secondary nav.
 *
 * The allowance is the FULL chrome height, not whatever is on screen at the
 * moment of the click. Jumping to an anchor scrolls upward as often as not,
 * which brings the secondary nav straight back in; reserving only the
 * currently-visible height would land the target underneath it.
 * ds/useStickyChrome.js keeps --ds-subnav-h at the measured height whether
 * the bar is shown or hidden, which is exactly what is wanted here.
 */
export const smoothScrollToId = (id, extra = 0) => {
  const el = document.getElementById(id)
  if (!el) return
  const styles = getComputedStyle(document.documentElement)
  const header = parseInt(styles.getPropertyValue('--ds-header-h'), 10) || 64
  const subnav = parseInt(styles.getPropertyValue('--ds-subnav-h'), 10) || 96
  smoothScrollTo(el.getBoundingClientRect().top + window.scrollY - header - subnav - 20 - extra)
}

export const smoothScrollToTop = () => smoothScrollTo(0)

/* ------------------------------------------- a note on wheel smoothing --- *

   There is deliberately no wheel-smoothing layer here.

   An earlier version intercepted wheel events and moved the real scroll
   position with a per-frame lerp. It was removed because it makes scrolling
   feel worse, not better, and does so in a way that is hard to tune away:

     - A trackpad already applies its own momentum curve at the OS level.
       Layering a second easing on top of that makes the page keep gliding
       after the fingers have lifted, and no choice of easing factor fixes
       it, the two curves simply compose.
     - Any interception adds latency between the input and the pixels, which
       reads as sluggishness even when the total travel is correct.
     - It fights every other way a page can scroll: the scrollbar, the
       keyboard, find-in-page, and the browser's own restoration.

   The parts of "smooth scrolling" actually worth having do not require it:
   eased programmatic jumps for anchors and back-to-top (smoothScrollTo
   above), entrance animations as sections come into view (Reveal), and the
   hero parallax below. Those give the page its sense of motion while the
   wheel stays exactly as responsive as the operating system intends.
   ------------------------------------------------------------------------ */

/* --------------------------------------------------- subtle hero parallax */

/**
 * Drifts an element slightly slower than the page as it scrolls. Kept very
 * small (a few percent of travel), enough to add depth behind hero copy,
 * not enough to induce the queasiness heavy parallax causes.
 */
export const useParallax = (strength = 0.12) => {
  const ref = useRef(null)

  useEffect(() => {
    const node = ref.current
    if (!node || prefersReducedMotion()) return undefined

    let raf = null
    const update = () => {
      raf = null
      const rect = node.getBoundingClientRect()
      if (rect.bottom < 0 || rect.top > window.innerHeight) return
      node.style.transform = `translate3d(0, ${rect.top * -strength}px, 0)`
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update) }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      if (raf) cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [strength])

  return ref
}

export default Reveal
