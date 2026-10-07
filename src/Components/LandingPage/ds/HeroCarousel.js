/* ============================================================================
   Home page hero carousel.
   ----------------------------------------------------------------------------
   The headline, standfirst and photograph rotate together; the buttons and
   the trial checklist underneath stay put. Keeping one conversion path on
   screen the whole time means a visitor never has to wait for the slide to
   come back round before they can act on it.

   Slides cross-fade rather than slide sideways. Each one occupies the same
   grid cell, so the outgoing and incoming copy overlap during the fade and
   the block never changes height between slides.

   Autoplay stops while the pointer is over the hero, while focus is inside
   it, and while the tab is in the background. Someone who has asked for
   less motion gets no autoplay at all and a straight swap instead of a
   fade, and can still move through the slides with the controls.

   Lives in its own file rather than in DS.js because it carries real state
   and timers, and DS.js is otherwise presentational.
   ========================================================================= */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParallax } from './motion'

const cx = (...parts) => parts.filter(Boolean).join(' ')

/* Long enough to read a headline and its standfirst without feeling parked. */
const DEFAULT_INTERVAL = 7000

const usePrefersReducedMotion = () => {
  const [reduce, setReduce] = useState(false)
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduce(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  return reduce
}

/**
 * @param slides   [{ key, eyebrow, title, lede, image }]
 * @param children persistent content under the standfirst (buttons, checklist)
 */
export const HeroCarousel = ({ slides = [], children, interval = DEFAULT_INTERVAL, label = 'Highlights' }) => {
  const count = slides.length
  const [active, setActive] = useState(0)
  const [held, setHeld] = useState(false)
  const trackRef = useParallax(0.1)
  const dotRefs = useRef([])
  const reduceMotion = usePrefersReducedMotion()

  /* Which photographs have been put in the document. A hero image is a big
     download and all four at once would compete with the one the visitor is
     actually looking at. Only the current slide and the one after it are
     mounted, so the next is already decoded by the time it is needed and the
     rest cost nothing until the carousel reaches them. */
  const [mounted, setMounted] = useState(() => new Set([0, count > 1 ? 1 : 0]))
  useEffect(() => {
    setMounted((previous) => {
      const next = new Set(previous)
      next.add(active)
      next.add((active + 1) % count)
      return next.size === previous.size ? previous : next
    })
  }, [active, count])

  /* Pausing freezes the progress bar where it is. Resuming restarts it,
     because the autoplay timer restarts too, and a bar that carried on from
     where it stopped would be telling you something that was not true. */
  const [resumes, setResumes] = useState(0)
  const wasHeld = useRef(held)
  useEffect(() => {
    if (wasHeld.current && !held) setResumes((n) => n + 1)
    wasHeld.current = held
  }, [held])

  const go = useCallback(
    (index) => setActive(((index % count) + count) % count),
    [count]
  )

  /* Keyed on `active`, so choosing a slide by hand also restarts the clock
     rather than cutting the chosen slide short. */
  useEffect(() => {
    if (held || reduceMotion || count < 2) return undefined
    const timer = setTimeout(() => setActive((current) => (current + 1) % count), interval)
    return () => clearTimeout(timer)
  }, [active, held, reduceMotion, count, interval])

  /* A carousel running in a tab nobody is looking at is just wasted work,
     and it means the visitor comes back to a slide they never saw start. */
  useEffect(() => {
    const onVisibility = () => setHeld(document.hidden)
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  const onDotsKeyDown = (event) => {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
    if (!step) return
    event.preventDefault()
    const next = ((active + step) % count + count) % count
    go(next)
    const button = dotRefs.current[next]
    if (button) button.focus()
  }

  if (!count) return null

  return (
    <section
      className={cx(
        'ds-hero immersive deep inset fit-viewport ds-on-deep ds-hero-carousel',
        held && 'is-held'
      )}
      aria-roledescription="carousel"
      aria-label={label}
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onFocusCapture={() => setHeld(true)}
      onBlurCapture={() => setHeld(false)}
    >
      <div className="ds-hero-bg">
        <div className="ds-hero-bg-track" ref={trackRef}>
          {slides.map((slide, index) => (
            mounted.has(index) && (
              <img
                key={slide.key}
                alt=""
                {...slide.image}
                fetchpriority={index === 0 ? 'high' : 'low'}
                className={cx('ds-hero-bg-img', index === active && 'is-active')}
              />
            )
          ))}
        </div>
      </div>

      <div className="ds-container">
        <div className="ds-hero-inner">
          <div className="ds-hero-copy split">
            <div className="ds-hero-lead">
              <div className="ds-hero-stack">
                {slides.map((slide, index) => (
                  <div
                    key={slide.key}
                    className={cx('ds-hero-slide', index === active && 'is-active')}
                    role="group"
                    aria-roledescription="slide"
                    aria-label={`${index + 1} of ${count}`}
                    aria-hidden={index !== active}
                  >
                    <span className="ds-eyebrow">{slide.eyebrow}</span>
                    <h1 className="ds-h1">{slide.title}</h1>
                  </div>
                ))}
              </div>
            </div>

            <div className="ds-hero-support">
              <div className="ds-hero-stack">
                {slides.map((slide, index) => (
                  <p
                    key={slide.key}
                    className={cx('ds-lede', 'ds-hero-slide', index === active && 'is-active')}
                    aria-hidden={index !== active}
                  >
                    {slide.lede}
                  </p>
                ))}
              </div>
              {children}
            </div>
          </div>

          {count > 1 && (
            <div
              className="ds-hero-dots"
              role="group"
              aria-label="Choose a highlight"
              onKeyDown={onDotsKeyDown}
            >
              {slides.map((slide, index) => (
                <button
                  key={slide.key}
                  type="button"
                  ref={(node) => { dotRefs.current[index] = node }}
                  className={cx('ds-hero-dot', index === active && 'is-active')}
                  aria-current={index === active ? 'true' : undefined}
                  onClick={() => go(index)}
                >
                  <span className="ds-hero-dot-bar">
                    {/* Remounted whenever the slide changes or autoplay
                        resumes, so the fill restarts from empty alongside the
                        timer it is reporting on. */}
                    <span
                      key={`${index}-${active}-${resumes}`}
                      className="ds-hero-dot-fill"
                      style={{ animationDuration: `${interval}ms` }}
                    />
                  </span>
                  <span className="ds-hero-dot-label">{slide.eyebrow}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export default HeroCarousel
