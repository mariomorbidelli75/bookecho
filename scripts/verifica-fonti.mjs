// Diagnostica delle fonti bibliografiche.
// Interroga /api/isbn su una lista di ISBN e dice, per ognuno, se copertina e
// trama sono arrivate e da quale fonte. Serve a capire in fretta se un calo di
// qualità dipende da noi o da un catalogo che non risponde.
//
// Uso:  node scripts/verifica-fonti.mjs [baseUrl] [isbn...]
//       node scripts/verifica-fonti.mjs https://bookecho-iota.vercel.app

const args = process.argv.slice(2)
const base = args.find(a => a.startsWith('http')) ?? 'http://localhost:3000'
const isbnArgs = args.filter(a => /^\d{10,13}$/.test(a))

const ISBN = isbnArgs.length > 0 ? isbnArgs : [
  '9788806219352', // Se questo è un uomo — Einaudi
  '9788807889929', // I Ching — Feltrinelli
  '9788804668237', // 1984 — Mondadori
  '9788845292613', // Il signore degli anelli — Bompiani
  '9788817087568', // Rizzoli
  '9788820062781', // Sonzogno
  '9788809785045', // Giunti
  '9788831004442', // Marsilio
]

const sleep = ms => new Promise(r => setTimeout(r, ms))
let cover = 0, summary = 0, both = 0, missing = 0

for (const isbn of ISBN) {
  try {
    const r = await fetch(`${base}/api/isbn?isbn=${isbn}`, { signal: AbortSignal.timeout(90000) })
    const j = await r.json()
    if (j.error) { missing++; console.log(`${isbn} → ${j.error}`); continue }
    if (j.cover) cover++
    if (j.summary) summary++
    if (j.cover && j.summary) both++
    const cov = j.cover ? (j.sources?.cover ?? 'si') : 'NESSUNA'
    const sum = j.summary ? `${String(j.summary.length).padStart(4)}ch ${j.sources?.summary ?? ''}` : 'NESSUNA'
    console.log(`${isbn} → ${String(j.title).slice(0, 32).padEnd(32)} cop:${cov.padEnd(12)} trama:${sum}${j.warning ? '  ⚠ ' + j.warning : ''}`)
  } catch (e) {
    console.log(`${isbn} → errore ${e.name}`)
  }
  await sleep(1500)   // Google Books va a 503 sulle richieste ravvicinate
}

console.log(`\nCopertina ${cover}/${ISBN.length} · Trama ${summary}/${ISBN.length} · Complete ${both}/${ISBN.length} · Non in catalogo ${missing}`)
