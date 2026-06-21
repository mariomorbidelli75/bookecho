import Link from 'next/link'

const FEATURES = [
  {
    num: '01',
    title: 'Scansiona la copertina',
    desc: 'Fotografa qualunque libro: AI riconosce titolo, autore ed edizione in secondi.',
    icon: '📷',
    dark: true,
  },
  {
    num: '02',
    title: 'Trailer audio generato dall\'AI',
    desc: 'Un riassunto di 90 secondi narrato con voce italiana naturale (ElevenLabs).',
    icon: '🎧',
    dark: false,
  },
  {
    num: '03',
    title: 'Valore di mercato',
    desc: 'Prezzi aggiornati da eBay, Catawiki, Vinted e Subito. Prima edizioni comprese.',
    icon: '📈',
    dark: false,
  },
  {
    num: '04',
    title: 'Annuncio pronto in un tap',
    desc: 'Titolo SEO, descrizione persuasiva e hashtag per ogni marketplace.',
    icon: '🚀',
    dark: false,
  },
]

const STATS = [
  { value: '4', label: 'Funzionalità core' },
  { value: '6', label: 'Marketplace supportati' },
  { value: 'AI', label: 'Claude + ElevenLabs' },
]

export default function LandingPage() {
  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: 'var(--cream)', color: 'var(--ink)', overflowX: 'hidden' }}>
      {/* NAVBAR */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        padding: '18px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: 'rgba(245,241,232,0.88)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--line)',
      }}>
        <div style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, background: 'var(--forest)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--cream)', fontSize: 15, fontWeight: 700 }}>L</div>
          Librò
        </div>
        <Link
          href="/app"
          style={{
            background: 'var(--forest)', color: 'var(--cream)', padding: '10px 22px',
            borderRadius: 100, fontSize: 14, fontWeight: 600, textDecoration: 'none', transition: 'all 0.2s',
          }}
        >
          Apri l'app →
        </Link>
      </nav>

      {/* HERO */}
      <section style={{ minHeight: '100vh', padding: '140px 48px 80px', maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px',
          background: 'var(--cream-2)', border: '1px solid var(--line-2)', borderRadius: 100,
          fontSize: 12, fontWeight: 500, marginBottom: 28, letterSpacing: '0.02em',
        }}>
          <span style={{ width: 6, height: 6, background: 'var(--accent-amber)', borderRadius: '50%', display: 'inline-block', animation: 'blink 2s ease-in-out infinite' }} />
          Versione Beta · Maggio 2026
        </div>

        <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: 'clamp(48px, 7vw, 96px)', fontWeight: 600, lineHeight: 1.02, letterSpacing: '-0.03em', marginBottom: 24, maxWidth: 900 }}>
          <span style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--forest)' }}>Librò</span>: tutti i libri{' '}
          <span style={{ position: 'relative', display: 'inline-block' }}>
            in un posto solo
            <span style={{ position: 'absolute', left: 0, right: 0, bottom: 4, height: 14, background: 'var(--accent-amber-soft)', zIndex: -1, opacity: 0.7 }} />
          </span>.
        </h1>

        <p style={{ fontSize: 20, color: 'var(--ink-2)', lineHeight: 1.55, marginBottom: 40, maxWidth: 580 }}>
          Scansiona qualunque libro, ascolta un trailer audio del contenuto, scopri il valore di mercato
          e crea annunci pronti per eBay, Catawiki, Vinted in un tap.
        </p>

        <div style={{ display: 'flex', gap: 12, marginBottom: 60 }}>
          <Link href="/app" style={{
            background: 'var(--forest)', color: 'var(--cream)', padding: '16px 32px',
            borderRadius: 100, fontSize: 16, fontWeight: 600, textDecoration: 'none',
            display: 'inline-flex', alignItems: 'center', gap: 10,
          }}>
            Prova subito gratis
            <span style={{ fontSize: 18 }}>→</span>
          </Link>
          <a href="#features" style={{
            padding: '16px 32px', borderRadius: 100, fontSize: 16, fontWeight: 500,
            textDecoration: 'none', border: '1px solid var(--line-2)', color: 'var(--ink)',
          }}>
            Scopri di più
          </a>
        </div>

        <div style={{ display: 'flex', gap: 40 }}>
          {STATS.map(s => (
            <div key={s.label}>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 28, fontWeight: 700 }}>{s.value}</div>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" style={{ padding: '100px 48px', background: 'var(--cream-2)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--forest)', marginBottom: 16 }}>Funzionalità</div>
          <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 'clamp(36px, 4.5vw, 56px)', fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 56, lineHeight: 1.05, maxWidth: 700 }}>
            Quattro strumenti per chi <span style={{ fontStyle: 'italic', color: 'var(--forest)', fontWeight: 400 }}>colleziona</span>.
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
            {FEATURES.map((f) => (
              <div
                key={f.num}
                style={{
                  background: f.dark ? 'var(--forest-darker)' : 'var(--cream)',
                  color: f.dark ? 'var(--cream)' : 'var(--ink)',
                  border: `1px solid ${f.dark ? 'var(--forest-darker)' : 'var(--line)'}`,
                  borderRadius: 24, padding: 32,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: f.dark ? 'var(--accent-amber)' : 'var(--muted)', marginBottom: 16, letterSpacing: '0.05em' }}>{f.num}</div>
                <div style={{ fontSize: 32, marginBottom: 12 }}>{f.icon}</div>
                <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 24, fontWeight: 600, marginBottom: 10, lineHeight: 1.2 }}>{f.title}</h3>
                <p style={{ fontSize: 15, lineHeight: 1.55, color: f.dark ? 'rgba(245,241,232,0.75)' : 'var(--ink-2)' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DEMO CTA */}
      <section style={{ padding: '120px 48px', background: 'var(--forest)', color: 'var(--cream)', textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 'clamp(40px, 5vw, 64px)', fontWeight: 600, lineHeight: 1.05, letterSpacing: '-0.02em', marginBottom: 20 }}>
          Pronto a <span style={{ fontStyle: 'italic', color: 'var(--accent-amber)', fontWeight: 400 }}>scoprire</span> la tua libreria?
        </h2>
        <p style={{ fontSize: 18, color: 'rgba(245,241,232,0.8)', maxWidth: 500, margin: '0 auto 40px' }}>
          Librò funziona subito, senza registrazione. Scansiona il tuo primo libro in 30 secondi.
        </p>
        <Link href="/app" style={{
          background: 'var(--accent-amber)', color: 'var(--ink)', padding: '18px 40px',
          borderRadius: 100, fontSize: 17, fontWeight: 700, textDecoration: 'none',
          display: 'inline-flex', alignItems: 'center', gap: 10,
        }}>
          Inizia ora — è gratis
          <span style={{ fontSize: 18 }}>→</span>
        </Link>
      </section>

      {/* FOOTER */}
      <footer style={{ background: 'var(--forest-darker)', color: 'rgba(245,241,232,0.5)', padding: '28px 48px', textAlign: 'center', fontSize: 13 }}>
        © 2026 Librò · tutti i libri in un posto solo · Fatto con ❤️ per i veri amanti dei libri
      </footer>

      <style>{`
        @media (max-width: 768px) {
          section { padding-left: 24px !important; padding-right: 24px !important; }
          nav { padding: 16px 24px !important; }
          h1 { font-size: clamp(36px, 8vw, 64px) !important; }
        }
      `}</style>
    </div>
  )
}
