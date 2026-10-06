/* ============================================================================
   Design-system primitives for the public pages.
   ----------------------------------------------------------------------------
   One component per structural pattern on sap.com, named after the pattern
   SAP's own front layer uses, so a page file reads as a list of sections
   rather than a pile of divs. Styling lives entirely in ds.css, nothing here
   carries inline style except values that are genuinely per-instance (an
   aspect ratio override, a background image URL).

   Every interactive element is a real <button> or <a>; nothing relies on a
   click handler bolted to a <div>, so keyboard and screen-reader users get
   the same affordances as everyone else.
   ========================================================================= */

import { useState, useRef, useEffect } from 'react'
import { Reveal, useParallax, smoothScrollToId } from './motion'
import './ds.css'

export { Reveal, useParallax } from './motion'

/* ---------------------------------------------------------------- glyphs -- */

export const Chevron = ({ dir = 'right' }) => {
  const rotate = { right: 0, down: 90, left: 180, up: 270 }[dir] || 0
  return (
    <svg
      className="ds-chev"
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
      focusable="false"
      style={rotate ? { transform: `rotate(${rotate}deg)` } : undefined}
    >
      <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/* ------------------------------------------------------------- utilities -- */

const cx = (...parts) => parts.filter(Boolean).join(' ')

/**
 * One place that decides whether a destination is in-app or external, so no
 * page has to remember to use navigate() for one and <a href> for the other.
 */
export const Action = ({ to, href, onClick, navigate, className, children, ...rest }) => {
  if (href) {
    const external = /^https?:\/\//.test(href)
    return (
      <a
        className={className}
        href={href}
        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        {...rest}
      >
        {children}
      </a>
    )
  }
  return (
    <button
      type="button"
      className={className}
      onClick={(event) => {
        if (onClick) onClick(event)
        if (to && navigate) navigate(to)
      }}
      {...rest}
    >
      {children}
    </button>
  )
}

/** `Learn more ›`, SAP's single most repeated link affordance. */
export const TextLink = ({ children, className, ...rest }) => (
  <Action className={cx('ds-link', className)} {...rest}>
    <span>{children}</span>
    <Chevron />
  </Action>
)

export const Button = ({ variant = 'primary', size, className, children, ...rest }) => (
  <Action className={cx('ds-btn', variant, size, className)} {...rest}>
    {children}
  </Action>
)

export const ButtonRow = ({ children, className }) => (
  <div className={cx('ds-btn-row', className)}>{children}</div>
)

export const Container = ({ width, className, children }) => (
  <div className={cx('ds-container', width, className)}>{children}</div>
)

/* --------------------------------------------------------------- section -- */

/**
 * SAP's Section: eyebrow + headline + subtitle, then content, then an
 * optional row of links. `split` puts the headline and the subtitle in two
 * columns, which SAP uses whenever the intro needs more than one sentence.
 */
export const Section = ({
  id,
  eyebrow,
  title,
  subtitle,
  children,
  footer,
  variant,
  align,
  split,
  rail,
  width,
  tight,
  flushTop,
  flushBottom,
  bodySnug,
  titleAs: TitleTag = 'h2',
  className,
}) => {
  const onDeep = variant === 'deep' || variant === 'deep-grad'
  const hasHead = eyebrow || title || subtitle
  // `rail` puts the heading in a sticky column beside the content. It needs
  // a heading to sit in, so without one it falls back to the stacked layout
  // rather than leaving an empty column.
  const useRail = rail && hasHead
  // In a rail the standfirst already sits under the heading in its own
  // narrow column, so the two-column header split has nothing to do.
  const useSplit = split && !useRail

  return (
    <section
      id={id}
      className={cx(
        'ds-section',
        variant,
        tight && 'tight',
        useRail && 'rail',
        flushTop && 'flush-top',
        flushBottom && 'flush-bottom',
        onDeep && 'ds-on-deep',
        className
      )}
    >
      <Container width={width}>
        {hasHead && (
          <Reveal
            variant="up"
            className={cx('ds-section-head', align === 'center' && 'center', useSplit && 'split')}
          >
            <div>
              {eyebrow && <span className="ds-eyebrow">{eyebrow}</span>}
              <div className="ds-rule" aria-hidden="true" />
              {title && <TitleTag className="ds-h2">{title}</TitleTag>}
              {!useSplit && subtitle && <p className="ds-lede ds-mb-0">{subtitle}</p>}
            </div>
            {useSplit && subtitle && (
              <div>
                <p className="ds-lede ds-mb-0">{subtitle}</p>
              </div>
            )}
          </Reveal>
        )}
        {/* Sibling blocks inside a section are spaced by this wrapper rather
            than by a margin written at each call site. */}
        <div className={cx('ds-section-body', bodySnug && 'snug')}>
          {children}
        </div>
        {footer && <Reveal variant="fade" className="ds-section-foot">{footer}</Reveal>}
      </Container>
    </section>
  )
}

/* ------------------------------------------------------------------ hero -- */

/**
 * SAP's HeroFixedHeight. Three shapes, all driven from props:
 *   - default      copy left, photograph right
 *   - textOnly     copy only, used on section landing pages
 *   - immersive    full-bleed photograph with the copy over a scrim
 */
export const Hero = ({
  eyebrow,
  title,
  lede,
  children,
  image,
  backgroundImage,
  tone,
  size,
  textOnly,
  id,
}) => {
  const immersive = !!backgroundImage
  const onDeep = tone === 'deep' || immersive
  const parallaxRef = useParallax(0.1)

  return (
    <section
      id={id}
      className={cx(
        'ds-hero',
        tone,
        size,
        immersive && 'immersive',
        !image && !immersive && 'text-only',
        textOnly && 'text-only',
        onDeep && 'ds-on-deep'
      )}
    >
      {immersive && (
        <div className="ds-hero-bg">
          <img ref={parallaxRef} {...backgroundImage} alt="" />
        </div>
      )}
      <Container>
        <div className="ds-hero-inner">
          {/* A hero is above the fold, so it animates on mount rather than on
              scroll. The stagger gives the eyebrow, headline, lede and CTAs a
              deliberate order instead of all four appearing at once. */}
          <div className="ds-hero-copy ds-hero-enter">
            {eyebrow && <span className="ds-eyebrow">{eyebrow}</span>}
            {title && <h1 className="ds-h1">{title}</h1>}
            {lede && <p className="ds-lede">{lede}</p>}
            {children}
          </div>
          {image && !immersive && (
            <Reveal variant="scale" delay={0.1} className="ds-hero-visual">
              <img alt="" {...image} />
            </Reveal>
          )}
        </div>
      </Container>
    </section>
  )
}

/** Stat strip, usually sat directly under a hero's copy. */
export const HeroStats = ({ items }) => (
  <div className="ds-hero-stats">
    {items.map((item) => (
      <div key={item.label}>
        <strong>{item.value}</strong>
        <span>{item.label}</span>
      </div>
    ))}
  </div>
)

/* ------------------------------------------------------------ fast facts -- */

/** SAP's SeveralBoxes/isFastFact row: a big light number over a short label. */
export const FastFacts = ({ items, cols = 4, className }) => (
  <Reveal stagger step={0.09} className={cx('ds-facts', `cols-${cols}`, className)}>
    {items.map((item) => (
      <div className="ds-fact" key={item.label}>
        <div className="ds-fact-value">
          {item.value}
          {item.suffix && <sup>{item.suffix}</sup>}
        </div>
        <div className="ds-fact-label">{item.label}</div>
      </div>
    ))}
  </Reveal>
)

/* ----------------------------------------------------------- fifty-fifty -- */

export const FiftyFifty = ({ eyebrow, title, children, image, reversed, titleAs: T = 'h3', id }) => (
  <div className={cx('ds-fifty', reversed && 'reversed')} id={id}>
    {/* Copy and image enter from opposite sides, which reads as the two
        halves assembling rather than as two separate things appearing. */}
    <Reveal variant={reversed ? 'right' : 'left'} className="ds-fifty-copy">
      {eyebrow && <span className="ds-eyebrow">{eyebrow}</span>}
      {title && <T className="ds-h2">{title}</T>}
      {children}
    </Reveal>
    {image && (
      <Reveal variant={reversed ? 'left' : 'right'} delay={0.08} className="ds-fifty-visual">
        <img alt="" {...image} />
      </Reveal>
    )}
  </div>
)

export const Checklist = ({ items, className }) => (
  <ul className={cx('ds-checklist', className)}>
    {items.map((item) => (
      <li key={typeof item === 'string' ? item : item.key}>{item}</li>
    ))}
  </ul>
)

/* ------------------------------------------------------------------ grid -- */

export const Grid = ({ cols = 3, tight, className, children, animate = true }) => {
  const classes = cx('ds-grid', `cols-${cols}`, tight && 'tight', className)
  if (!animate) return <div className={classes}>{children}</div>
  return <Reveal stagger className={classes}>{children}</Reveal>
}

/* ------------------------------------------------------------------ card -- */

export const Card = ({
  image,
  mediaShape,
  badge,
  eyebrow,
  title,
  text,
  link,
  children,
  flat,
  bodySize,
  titleAs: T = 'h3',
  ...action
}) => {
  const interactive = action.to || action.href || action.onClick
  const body = (
    <>
      {image && (
        <div className={cx('ds-card-media', mediaShape)}>
          <img alt="" {...image} />
          {badge && <span className="ds-card-badge">{badge}</span>}
        </div>
      )}
      <div className={cx('ds-card-body', bodySize)}>
        {eyebrow && <span className="ds-card-eyebrow">{eyebrow}</span>}
        {title && <T className="ds-card-title">{title}</T>}
        {text && <p className="ds-card-text">{text}</p>}
        {children}
        {link && (
          <div className="ds-card-foot">
            <span className="ds-link" aria-hidden="true">
              <span>{link}</span>
              <Chevron />
            </span>
          </div>
        )}
      </div>
    </>
  )

  const className = cx('ds-card', flat && 'flat')
  if (!interactive) return <div className={className}>{body}</div>
  return (
    <Action className={className} {...action}>
      {body}
    </Action>
  )
}

/* ----------------------------------------------------------------- tiles -- */

/**
 * A grid of spaced cards. These used to sit in a 1px hairline grid, which
 * meant their children could not be translated during the reveal without
 * tearing the separators open, hence the fade-only stagger. Now that they
 * are individually bordered cards with real gaps, they take the same
 * entrance as every other grid.
 */
export const Tiles = ({ cols = 3, className, children, animate = true }) => {
  const classes = cx('ds-tiles', `cols-${cols}`, className)
  if (!animate) return <div className={classes}>{children}</div>
  return <Reveal stagger step={0.05} className={classes}>{children}</Reveal>
}

export const Tile = ({ eyebrow, title, text, link, children, titleAs: T = 'h3', ...action }) => {
  const interactive = action.to || action.href || action.onClick
  const body = (
    <>
      {eyebrow && <span className="ds-card-eyebrow">{eyebrow}</span>}
      {title && <T className="ds-tile-title">{title}</T>}
      {text && <p className="ds-tile-text">{text}</p>}
      {children}
      {link && (
        <div className="ds-tile-foot">
          <span className="ds-link" aria-hidden="true">
            <span>{link}</span>
            <Chevron />
          </span>
        </div>
      )}
    </>
  )
  if (!interactive) return <div className="ds-tile">{body}</div>
  return (
    <Action className="ds-tile" {...action}>
      {body}
    </Action>
  )
}

/* -------------------------------------------------------------- showcase -- */

/**
 * SAP's "pick a capability on the left, see it on the right" block. Rendered
 * as a real tab list so arrow keys work the way a tab list should.
 */
export const Showcase = ({ items, initial = 0 }) => {
  const [active, setActive] = useState(initial)
  const tabRefs = useRef([])
  const current = items[active] || items[0]

  const onKeyDown = (event) => {
    const last = items.length - 1
    let next = null
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') next = active === last ? 0 : active + 1
    if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') next = active === 0 ? last : active - 1
    if (event.key === 'Home') next = 0
    if (event.key === 'End') next = last
    if (next === null) return
    event.preventDefault()
    setActive(next)
    tabRefs.current[next]?.focus()
  }

  return (
    <div className="ds-showcase">
      <div className="ds-showcase-tabs" role="tablist" aria-orientation="vertical" onKeyDown={onKeyDown}>
        {items.map((item, index) => (
          <button
            key={item.label}
            ref={(el) => { tabRefs.current[index] = el }}
            type="button"
            role="tab"
            id={`ds-showcase-tab-${index}`}
            aria-selected={active === index}
            aria-controls={`ds-showcase-panel-${index}`}
            tabIndex={active === index ? 0 : -1}
            className={cx('ds-showcase-tab', active === index && 'active')}
            onClick={() => setActive(index)}
          >
            <strong>{item.label}</strong>
            {item.summary && <span>{item.summary}</span>}
          </button>
        ))}
      </div>
      <div
        className="ds-showcase-panel"
        role="tabpanel"
        id={`ds-showcase-panel-${active}`}
        aria-labelledby={`ds-showcase-tab-${active}`}
        tabIndex={0}
      >
        {current.image && (
          <div className="ds-showcase-media">
            <img alt="" {...current.image} />
          </div>
        )}
        <h3 className="ds-h3">{current.title}</h3>
        <p className="ds-body">{current.body}</p>
        {current.points && <Checklist items={current.points} />}
        {current.link}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------- accordion -- */

export const Accordion = ({ items, allowMultiple }) => {
  const [open, setOpen] = useState(() => new Set())
  const toggle = (index) => {
    setOpen((prev) => {
      const next = allowMultiple ? new Set(prev) : new Set()
      if (prev.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }
  return (
    <div className="ds-accordion">
      {items.map((item, index) => {
        const isOpen = open.has(index)
        return (
          <div className={cx('ds-accordion-item', isOpen && 'open')} key={item.q}>
            <h3 className="ds-mb-0">
              <button
                type="button"
                className="ds-accordion-btn"
                aria-expanded={isOpen}
                aria-controls={`ds-acc-panel-${index}`}
                id={`ds-acc-btn-${index}`}
                onClick={() => toggle(index)}
              >
                <span>{item.q}</span>
                <span className="ds-accordion-sign" aria-hidden="true" />
              </button>
            </h3>
            {isOpen && (
              <div className="ds-accordion-panel" id={`ds-acc-panel-${index}`} role="region" aria-labelledby={`ds-acc-btn-${index}`}>
                {Array.isArray(item.a) ? item.a.map((p, i) => <p key={i}>{p}</p>) : <p>{item.a}</p>}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ----------------------------------------------------------------- quote -- */

export const Quote = ({ children, name, role, company, avatar }) => (
  <figure className="ds-quote">
    <blockquote>{children}</blockquote>
    <figcaption className="ds-quote-by">
      {avatar && <img alt="" className="ds-quote-avatar" {...avatar} />}
      <div>
        <strong>{name}</strong>
        <span>{[role, company].filter(Boolean).join(', ')}</span>
      </div>
    </figcaption>
  </figure>
)

/* ------------------------------------------------------------ logo strip -- */

export const LogoStrip = ({ label, items }) => (
  <div className="ds-logostrip">
    <Container>
      {label && <p className="ds-logostrip-label">{label}</p>}
      <div className="ds-logostrip-items">
        {items.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>
    </Container>
  </div>
)

/* ----------------------------------------------------------------- table -- */

export const Table = ({ head, rows, highlightCol }) => (
  <div className="ds-table-wrap">
    <table className="ds-table">
      <thead>
        <tr>
          {head.map((cell, i) => (
            <th key={cell} scope="col" className={highlightCol === i ? 'highlight' : undefined}>
              {cell}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row[0]}>
            {row.map((cell, i) =>
              i === 0 ? (
                <th key={i} scope="row">{cell}</th>
              ) : (
                <td key={i} className={highlightCol === i ? 'highlight' : undefined}>{cell}</td>
              )
            )}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)

/* ------------------------------------------------------------ cta banner -- */

export const CTABanner = ({ eyebrow, title, text, children }) => (
  <section className="ds-section deep-grad ds-on-deep">
    <Container width="narrow">
      <div className="ds-center">
        {eyebrow && <span className="ds-eyebrow">{eyebrow}</span>}
        <h2 className="ds-h2">{title}</h2>
        {text && <p className="ds-lede">{text}</p>}
        <div className="ds-btn-row" style={{ justifyContent: 'center' }}>{children}</div>
      </div>
    </Container>
  </section>
)

/* ------------------------------------------------------------- filtering -- */

export const Pills = ({ options, value, onChange, label }) => (
  <div className="ds-pills" role="group" aria-label={label}>
    {options.map((option) => {
      const key = typeof option === 'string' ? option : option.value
      const text = typeof option === 'string' ? option : option.label
      return (
        <button
          key={key}
          type="button"
          className={cx('ds-pill', value === key && 'active')}
          aria-pressed={value === key}
          onClick={() => onChange(key)}
        >
          {text}
        </button>
      )
    })}
  </div>
)

/* ------------------------------------------------- scroll-spy for subnav -- */

/**
 * Tracks which in-page section is currently in view so the secondary nav can
 * highlight it, the way SAP's in-page tabs do. Returns the active id.
 */
/**
 * `offset` is where the "current section" line sits, measured from the top
 * of the viewport. It defaults to just below the full chrome, read live so
 * it stays correct on pages whose secondary nav is taller or absent. Passing
 * a number overrides it.
 */
const chromeOffset = () => {
  if (typeof window === 'undefined') return 180
  const styles = getComputedStyle(document.documentElement)
  const header = parseInt(styles.getPropertyValue('--ds-header-h'), 10) || 64
  const subnav = parseInt(styles.getPropertyValue('--ds-subnav-h'), 10) || 96
  return header + subnav + 24
}

export const useScrollSpy = (ids, offset) => {
  const [active, setActive] = useState(ids[0])

  // `ids` is almost always a fresh array literal from the calling page, so
  // depending on it directly would re-subscribe the scroll listener on every
  // render. Joining it gives a stable primitive to depend on instead.
  const key = ids.join('|')

  useEffect(() => {
    const sectionIds = key ? key.split('|') : []
    if (!sectionIds.length) return undefined

    let frame = null

    const measure = () => {
      frame = null
      const line = offset ?? chromeOffset()
      let current = sectionIds[0]
      for (const id of sectionIds) {
        const el = document.getElementById(id)
        if (el && el.getBoundingClientRect().top <= line) current = id
      }
      // React bails out on an identical value, so this only re-renders the
      // sub-nav when the highlighted section genuinely changes.
      setActive(current)
    }

    // getBoundingClientRect forces a layout, and a scroll event can fire many
    // times per frame. Coalescing to one measurement per frame is the
    // difference between a sub-nav that tracks the page and one that makes
    // the whole page feel heavy to scroll.
    const onScroll = () => { if (frame === null) frame = requestAnimationFrame(measure) }

    measure()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      if (frame !== null) cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [key, offset])

  return active
}

/**
 * Scrolls to an in-page anchor, allowing for the sticky header + subnav.
 * Delegates to the eased implementation in ds/motion.js, native
 * `behavior: 'smooth'` is linear and feels mechanical over long distances.
 */
export const scrollToId = smoothScrollToId
export { smoothScrollTo, smoothScrollToId, smoothScrollToTop } from './motion'

const DS = {
  Action,
  Accordion,
  Button,
  ButtonRow,
  Card,
  Checklist,
  Chevron,
  Container,
  CTABanner,
  FastFacts,
  FiftyFifty,
  Grid,
  Hero,
  HeroStats,
  LogoStrip,
  Pills,
  Quote,
  Section,
  Showcase,
  Table,
  TextLink,
  Tile,
  Tiles,
}

export default DS
