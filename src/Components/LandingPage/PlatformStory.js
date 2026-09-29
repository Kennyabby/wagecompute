import { useState } from 'react'
import './PlatformStory.css'
import platformStoryContent from './platformStoryContent'

const PlatformStory = () => {
  const { intro, chapters, closing } = platformStoryContent
  const [activeChapter, setActiveChapter] = useState(null)

  const scrollToChapter = (id) => {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setActiveChapter(id)
    }
  }

  return (
    <section className="ps-root" id="our-story">
      <div className="ps-page">

        <p className="ps-kicker">{intro.kicker}</p>
        <h1 className="ps-title">{intro.title}</h1>
        <p className="ps-lede">{intro.lede}</p>
        {intro.paragraphs.map((p, i) => <p className="ps-p" key={i}>{p}</p>)}

        <div className="ps-pillar-row">
          {intro.pillars.slice(0, 3).map((pillar) => (
            <div className="ps-pillar" key={pillar.num}>
              <p className="ps-pillar-num">{pillar.num}</p>
              <p className="ps-pillar-title">{pillar.title}</p>
              <p className="ps-pillar-body">{pillar.body}</p>
            </div>
          ))}
        </div>
        <div className="ps-pillar-row">
          {intro.pillars.slice(3, 6).map((pillar) => (
            <div className="ps-pillar" key={pillar.num}>
              <p className="ps-pillar-num">{pillar.num}</p>
              <p className="ps-pillar-title">{pillar.title}</p>
              <p className="ps-pillar-body">{pillar.body}</p>
            </div>
          ))}
        </div>

        <hr className="ps-divider" />

        <p className="ps-nav-label">Jump to a chapter</p>
        <nav className="ps-chapter-nav">
          {chapters.map((chapter) => (
            <button
              type="button"
              key={chapter.id}
              className={`ps-chapter-nav-item ${activeChapter === chapter.id ? 'active' : ''}`}
              onClick={() => scrollToChapter(chapter.id)}
            >
              {chapter.kicker}
            </button>
          ))}
        </nav>

        {chapters.map((chapter) => (
          <div className="ps-chapter" id={chapter.id} key={chapter.id}>
            <hr className="ps-divider" />
            <p className="ps-kicker">{chapter.kicker}</p>
            <h2 className="ps-h2">{chapter.title}</h2>
            <p className="ps-lede">{chapter.lede}</p>
            {chapter.paragraphs.map((p, i) => <p className="ps-p" key={i}>{p}</p>)}
            {chapter.quote && (
              <div className="ps-quote-box"><p>{chapter.quote}</p></div>
            )}
            {chapter.whyMatters && (
              <>
                <h3 className="ps-h3">Why this matters</h3>
                <p className="ps-p">{chapter.whyMatters}</p>
              </>
            )}
            {chapter.bridge && <p className="ps-bridge">{chapter.bridge}</p>}
          </div>
        ))}

        <hr className="ps-divider" />

        <p className="ps-kicker">{closing.kicker}</p>
        <h2 className="ps-h2">{closing.title}</h2>
        <table className="ps-table">
          <thead>
            <tr>
              {closing.table.headers.map((h) => <th key={h}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {closing.table.rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => <td key={j}>{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>

      </div>
    </section>
  )
}

export default PlatformStory
