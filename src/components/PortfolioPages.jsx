import { useEffect, useState } from 'react'

const campaignMain = '/portfolio/work/campaign-review.jpg'
const campaignDetail = '/portfolio/work/campaign-detail.jpg'
const productVideo = '/portfolio/work/product-features.mp4'

const JOURNEY = [
  { period: 'From', title: 'National Taiwan University', image: '/portfolio/journey/ntu.jpg', icon: '🎓', description: ['Major in Marketing & Communications', 'Minor in Economics', 'Two marketing internships'] },
  { period: '2.5 years at', title: 'KAO (Taiwan) Corporation', image: '/portfolio/journey/kao.jpg', icon: '🛍️', description: 'Managed digital marketing strategy, annual budgets and P&L across leading consumer brands, partnering with agencies and product teams.' },
  { period: '2.5 years at', title: 'Uber Eats Grocery & Retail', image: '/portfolio/journey/uber.jpg', icon: '🥫', description: 'Manage consumer marketing, campaigns, advertising partnerships and analytics—coordinating across Product, Ads, Commercial and Legal.' },
  { period: '2 years at…', title: 'Next stop…?', image: null, icon: '✈️', future: true },
]

const mediaRange = (folder, count) => Array.from({ length: count }, (_, i) => `/portfolio/activities/${folder}/${i + 1}.jpg`)

const WORK = [
  {
    number: '01', eyebrow: 'Strategy · Cross-functional leadership', title: 'Campaign Review Framework', stat: '+40%', statLabel: 'average campaign sales growth',
    paragraphs: [
      "For the first four years of Dark Grocery, the team had never conducted a systematic campaign review. Campaign planning often relied on experience, memory, and assumptions. When I was tasked with planning the following year's marketing calendar, I believed we first needed to understand what had actually worked in the past.",
      "I brought together a data analyst and a senior buyer, consolidated four years of historical data, established consistent evaluation criteria, and combined their expertise to build the team's first campaign review framework. The analysis shaped our 2026 campaign strategy and calendar. Since implementing the changes, campaign sales have grown by 40%+ on average, compared with typically no more than 15% previously. The team continues to use the framework to review and improve each campaign.",
    ], summary: 'Built the team’s first four-year campaign review framework, lifting average campaign sales growth to 40%+.', media: [campaignMain, campaignDetail, '/portfolio/work/campaign-review-2.jpg'],
  },
  {
    number: '02', eyebrow: 'Product · Go-to-market', title: 'Launching New Product Features', stat: '10+', statLabel: 'Features launched', statSecondary: '10%', statSecondaryLabel: 'Contribution to annual ads revenue target',
    paragraphs: [
      "Spearheaded the Taiwan launch of 10+ product features, developing operational playbooks that accelerated team adoption and helped drive more than 10% of Dark Grocery's annual advertising revenue target.",
      "I helped bring more than 10 new product features to life in Taiwan—including Storefront Collection Pinning, Storefront Ads, and Collection Offers. My role spanned testing each feature, validating its business value, and turning what we learned into playbooks that the broader team could easily adopt. These new capabilities also opened up additional opportunities for brands to invest their advertising budgets with us.",
    ], summary: 'Launched 10+ product features and contributed over 10% of the annual advertising revenue target.', video: productVideo, extraMedia: ['/portfolio/work/storefront-ads.jpg', '/portfolio/work/collection-offer.jpg'], mediaNotes: [
      { title: 'Pinned Collections (Video)', text: 'We pin product selections based on campaign themes and promotional priorities, ensuring customers see the products we most want to highlight when they enter the store.' },
      { title: 'Storefront Ads', text: 'Storefront Ads allow us to feature priority products or offer ad placements to brands that want greater visibility for their products.' },
      { title: 'Collection Offers', text: 'Collection Offers enable more flexible promotion settings, allowing us to experiment with different product combinations and discount structures.' },
    ],
  },
  {
    number: '03', eyebrow: 'Campaign · Social storytelling', title: 'Campaign Planning & Marketing Communications', stat: '500K', statLabel: 'organic views in two days',
    paragraphs: [
      "This is just one of the 100+ campaigns I've worked on over the past two years. For this campaign, we turned Dark Grocery's unexpected product selection into a gifting story—because who would expect that you could order a Jellycat, Nintendo Switch 2, PS5, or Diptyque through Uber Eats?",
      "As a Jellycat fan myself, I posted “What! You can buy Jellycat on Uber Eats!” on Threads to promote the campaign. The post reached 500K views within two days—and the Jellycat inventory sold out on the same day I posted it.",
    ], summary: 'Turned an unexpected product range into a gifting campaign—earning 500K views and selling out Jellycat in one day.', media: Array.from({ length: 5 }, (_, i) => `/portfolio/work/campaign-${i + 1}.jpg`), portrait: true,
  },
]

const ACTIVITIES = [
  { number: '01', title: 'Beverage & Snacks Minister', tag: 'Daily joy, delivered', images: mediaRange('drinks', 5), paragraphs: [
    "I’m the unofficial “Minister of Beverages” and afternoon tea specialist at work. To make everyone’s workday a little happier, I’ve somehow taken on the daily responsibility of organizing our drink orders—from deciding what to get and inviting everyone to the group order, to placing the order, picking up the drinks, and collecting payments.",
    "I’m happy to handle all these little logistics as soon as I get to the office, because I believe everyone deserves their daily dose of happiness. And whenever I’m craving an afternoon snack, I’ll usually rally the team to join me—just to make sure everyone has enough calories and blood sugar to survive the rest of the workday.",
  ]},
  { number: '02', title: 'Birthday Captain', tag: 'Making people feel remembered', images: mediaRange('birthday', 9), paragraphs: [
    "Passionate about creating joy, I have tracked classmates’ birthdays since middle school, organized surprises, and made sure even overlooked peers felt remembered. A bullied classmate once thanked me, noting that her birthday was the one day she felt truly seen by the class.",
    "I’ve carried the same tradition into the workplace. I keep track of my colleagues’ birthdays, plan surprises in advance, order cakes, and block time on everyone’s calendars so we can celebrate together. It’s a small thing, but I love making sure the people around me feel remembered—and giving everyone an excuse to share a little happiness together.",
  ]},
  { number: '03', title: 'Inadvertent Social Media Sensation', tag: 'A very serious dating analysis', images: mediaRange('viral', 3), paragraphs: [
    "I once unexpectedly went viral after appearing in a street interview by HahaTai, a Taiwanese YouTube channel with over 1 million subscribers. The topic was “Dating a Player vs. Someone Who’s Been Single Their Whole Life,” and I gave a very serious analysis of why someone with zero dating experience might actually make a great partner. My candid and slightly contrarian take ended up reaching over 1 million views on YouTube and 600K+ plays on Instagram—probably one of the most unexpected viral moments of my life.",
  ]},
  { number: '04', title: 'Doodle Everywhere', tag: 'Thinking with a pen in hand', images: mediaRange('doodles', 12), paragraphs: [
    "I’ve always loved doodling—on textbooks as a student, on office whiteboards after I started working, and occasionally even in my colleagues’ notebooks. Surprisingly, keeping my hands busy helps me focus and gives my mind more space to think. So whenever there’s a pen and a blank piece of paper nearby, chances are I’ll start sketching whatever random thing catches my eye.",
    "Doodling is also one of the ways I document my life. I’ve drawn portraits of teammates as farewell gifts, sketched the medieval magic and adventures I encountered while playing LARP, and illustrated desserts that were simply too good not to remember. I love adding drawings and splashes of color alongside plain words—making everyday memories a little more vivid, playful, and uniquely mine.",
  ]},
]

function PageIntro({ kicker, title, children }) {
  return <header className="portfolio-intro fade-up"><p>{kicker}</p><h1>{title}</h1><div className="intro-copy">{children}</div></header>
}

export function WorkPage() {
  const [selected, setSelected] = useState(null)
  useEffect(() => {
    document.body.style.overflow = selected ? 'hidden' : ''
    const closeOnEscape = (event) => { if (event.key === 'Escape') setSelected(null) }
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [selected])

  return <main className="portfolio-page work-hub">
    <section className="journey" aria-labelledby="journey-title">
      <div className="journey-heading"><p>My journey so far</p></div>
      <div className="journey-track">{JOURNEY.map((stop) => <article className={`journey-stop ${stop.future ? 'is-future' : ''}`} key={stop.title}>
        <div className="journey-period"><span>{stop.icon}</span>{stop.period}</div>
        <div className="journey-card"><div className="journey-name">{stop.title}</div>{stop.image ? <img src={stop.image} alt={`${stop.title} chapter`} /> : <div className="journey-question">The next chapter<br/>is waiting.</div>}</div>
        {stop.description && <p className="journey-description">{Array.isArray(stop.description) ? stop.description.map((line) => <span key={line}>{line}</span>) : stop.description}</p>}
      </article>)}</div>
    </section>

    <ProjectRail title="Creating Impact at Work" subtitle="Tap a project to see the full story" items={WORK} onSelect={setSelected} />
    <ProjectRail title="Exploring Opportunities at School" subtitle="More stories coming soon" items={[
      { number: '01', title: 'University Project', eyebrow: 'Exploration · Collaboration' },
      { number: '02', title: 'Campus Experience', eyebrow: 'Leadership · Community' },
      { number: '03', title: 'The Next Opportunity', eyebrow: 'Coming soon' },
    ]} placeholder />

    {selected && <ProjectOverlay item={selected} onClose={() => setSelected(null)} />}
    <PortfolioFooter />
  </main>
}

function ProjectRail({ title, subtitle, items, onSelect, placeholder = false }) {
  return <section className="project-rail-section">
    {(title || subtitle) && <div className="rail-heading">{title && <h2>{title}</h2>}{subtitle && <p>{subtitle}</p>}</div>}
    <div className="project-rail">{items.map((item) => {
      const cover = item.media?.[0] || item.images?.[0] || item.extraMedia?.[0]
      const content = <><div className={`rail-cover ${placeholder ? 'is-placeholder' : ''}`}>{cover ? <img src={cover} alt="" /> : <span>{item.number}</span>}</div><div className="rail-copy"><span>{item.eyebrow || item.tag}</span><h3>{item.title}</h3>{item.stat && <div className="tile-stat"><div><strong>{item.stat}</strong><span>{item.statLabel}</span></div>{item.statSecondary && <div><strong>{item.statSecondary}</strong><span>{item.statSecondaryLabel}</span></div>}</div>}<p>{placeholder ? 'Details to be added.' : (item.summary || item.paragraphs[0])}</p>{!placeholder && <b>View project <span>↗</span></b>}</div></>
      return placeholder ? <article className="project-tile is-coming" key={item.number}>{content}</article> : <button className="project-tile" onClick={() => onSelect(item)} key={item.number}>{content}</button>
    })}</div>
  </section>
}

function ProjectOverlay({ item, onClose }) {
  const sources = [
    ...(item.video ? [{ type: 'video', src: item.video }] : []),
    ...[...(item.media || item.images || []), ...(item.extraMedia || [])].map((src) => ({ type: 'image', src })),
  ]
  const [active, setActive] = useState(0)
  const current = sources[active]
  return <div className="project-overlay" role="dialog" aria-modal="true" aria-labelledby="expanded-project-title" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
    <article className="expanded-project">
      <button className="overlay-close" onClick={onClose} aria-label="Close project">×</button>
      <div className="expanded-gallery">
        <div className="gallery-thumbs">{sources.map((source, i) => <button key={source.src} className={active === i ? 'is-active' : ''} onClick={() => setActive(i)} aria-label={`Show project visual ${i + 1}`}>{source.type === 'video' ? <video src={source.src} muted preload="metadata" /> : <img src={source.src} alt="" />}{source.type === 'video' && <span>▶</span>}</button>)}</div>
        <div className="gallery-main">{current?.type === 'video' ? <video key={current.src} src={current.src} controls muted playsInline autoPlay aria-label={`${item.title} screen recording`} /> : <img src={current?.src} alt={`${item.title} selected project visual`} />}</div>
      </div>
      <div className="expanded-copy"><div className="project-rule"><span>{item.number}</span><span>{item.eyebrow || item.tag}</span></div><h2 id="expanded-project-title">{item.title}</h2>{item.stat && <div className="project-stat"><div><strong>{item.stat}</strong><span>{item.statLabel}</span></div>{item.statSecondary && <div><strong>{item.statSecondary}</strong><span>{item.statSecondaryLabel}</span></div>}</div>}{item.mediaNotes?.[active] && <div className="media-note"><strong>{item.mediaNotes[active].title}</strong><p>{item.mediaNotes[active].text}</p></div>}{item.paragraphs.map((p) => <p key={p}>{p}</p>)}</div>
    </article>
  </div>
}

export function ActivitiesPage() {
  const [selected, setSelected] = useState(null)
  useEffect(() => {
    document.body.style.overflow = selected ? 'hidden' : ''
    const closeOnEscape = (event) => { if (event.key === 'Escape') setSelected(null) }
    window.addEventListener('keydown', closeOnEscape)
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', closeOnEscape) }
  }, [selected])

  return <main className="portfolio-page activities-page activities-hub">
    <section className="activities-title"><h1>Spreading Happiness <em>and doing random things.</em></h1><p>Swipe through the stories</p></section>
    <ProjectRail items={ACTIVITIES} onSelect={setSelected} />
    {selected && <ProjectOverlay item={selected} onClose={() => setSelected(null)} />}
    <PortfolioFooter />
  </main>
}

function PortfolioFooter() {
  return <footer className="portfolio-footer"><span>Curious by nature.</span><span>Playful on purpose.</span><span>Built with care.</span></footer>
}
