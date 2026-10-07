/* ============================================================================
   Block renderer for a blog post body.
   ----------------------------------------------------------------------------
   One component, one switch, no recursion. A post body is a flat array by
   design: nesting would make the central admin editor substantially harder to
   build and would buy almost nothing, since long-form prose is flat anyway.

   Every block type here has a counterpart in the admin editor. Adding one
   means adding it in three places: the schema note in content/blog/index.js,
   the case below, and the editor. The list is short enough that this is
   cheaper than a plugin system nobody would extend.
   ========================================================================= */

import { img, photoUrl } from './landingImages'
import { renderInline } from './blogMarkup'

const CALLOUT_TONES = ['info', 'warn', 'idea']

const Inline = ({ text, refIndex, navigate }) => <>{renderInline(text, refIndex, navigate)}</>

const ListItems = ({ items, refIndex, navigate }) =>
  items.map((item, i) => (
    <li key={i}><Inline text={item} refIndex={refIndex} navigate={navigate} /></li>
  ))

export const BlogBlock = ({ block, index, refIndex, navigate }) => {
  const inline = (text) => <Inline text={text} refIndex={refIndex} navigate={navigate} />

  switch (block.t) {
    case 'p':
      return <p className="blog-p">{inline(block.text)}</p>

    case 'h2':
      // id matches headingsOf() in blogMarkup so the contents list can jump here
      return <h2 className="blog-h2" id={`s${index}`}>{block.text}</h2>

    case 'h3':
      return <h3 className="blog-h3">{block.text}</h3>

    case 'ul':
      return <ul className="blog-ul"><ListItems items={block.items} refIndex={refIndex} navigate={navigate} /></ul>

    case 'ol':
      return <ol className="blog-ol"><ListItems items={block.items} refIndex={refIndex} navigate={navigate} /></ol>

    case 'quote':
      return (
        <blockquote className="blog-quote">
          <p>{inline(block.text)}</p>
          {block.cite && <cite>{block.cite}</cite>}
        </blockquote>
      )

    case 'pull':
      return <aside className="blog-pull"><p>{inline(block.text)}</p></aside>

    case 'image': {
      const credit = photoUrl(block.name)
      return (
        <figure className="blog-figure">
          <img {...img(block.name, 'showcase')} alt={block.alt || ''} />
          {(block.caption || credit) && (
            <figcaption>
              {block.caption}
              {credit && (
                <span className="blog-credit">
                  {' '}
                  <a href={credit} target="_blank" rel="noopener noreferrer nofollow">Photograph via Pexels</a>
                </span>
              )}
            </figcaption>
          )}
        </figure>
      )
    }

    /* The tone is part of the class name rather than a second bare class.
       Every stylesheet in this app is loaded globally, so a bare `info` on
       this element picked up an unrelated `.info { height: 70% }` from
       FormPage.css and stretched the box to most of the article's height. */
    case 'callout':
      return (
        <aside className={`blog-callout blog-callout-${CALLOUT_TONES.includes(block.tone) ? block.tone : 'info'}`}>
          {block.title && <p className="blog-callout-title">{block.title}</p>}
          <p className="blog-callout-text">{inline(block.text)}</p>
        </aside>
      )

    case 'table':
      return (
        <div className="blog-table-wrap">
          <table className="blog-table">
            {block.head && (
              <thead>
                <tr>{block.head.map((cell, i) => <th key={i}>{inline(cell)}</th>)}</tr>
              </thead>
            )}
            <tbody>
              {block.rows.map((row, r) => (
                <tr key={r}>{row.map((cell, c) => <td key={c}>{inline(cell)}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      )

    case 'takeaways':
      return (
        <aside className="blog-takeaways">
          <p className="blog-takeaways-title">What to take from this</p>
          <ul><ListItems items={block.items} refIndex={refIndex} navigate={navigate} /></ul>
        </aside>
      )

    case 'steps':
      return (
        <ol className="blog-steps">
          {block.items.map((step, i) => (
            <li key={i}>
              <span className="blog-step-title">{step.title}</span>
              <span className="blog-step-text">{inline(step.text)}</span>
            </li>
          ))}
        </ol>
      )

    case 'note':
      return <p className="blog-note">{inline(block.text)}</p>

    case 'divider':
      return <hr className="blog-divider" />

    /* Labelled on purpose. The blog is only worth running if it is useful to
       someone who will never buy anything, and the honest way to let the
       product appear is to mark it plainly rather than thread it through the
       prose. */
    case 'aside':
      return (
        <aside className="blog-promo">
          <p className="blog-promo-label">From Enterprise Compute</p>
          {block.title && <p className="blog-promo-title">{block.title}</p>}
          <p className="blog-promo-text">{inline(block.text)}</p>
          {block.to && navigate && (
            <button type="button" className="blog-promo-link" onClick={() => navigate(block.to)}>
              Read more about this
            </button>
          )}
        </aside>
      )

    default:
      return null
  }
}

export const BlogBody = ({ post, refIndex, navigate }) => (
  <>
    {(post.body || []).map((block, index) => (
      <BlogBlock key={index} block={block} index={index} refIndex={refIndex} navigate={navigate} />
    ))}
  </>
)

export default BlogBody
