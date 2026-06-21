// Marketplace di acquisto libri (nuovi, usati e da collezione).
// Genera link di ricerca per titolo + autore su ogni piattaforma.

export interface BuyLink {
  platform: string
  url: string
  /** Tipologia: nuovo, usato o collezione */
  kind: 'nuovo' | 'usato' | 'collezione'
  color: string
}

export function buyLinks(title: string, author = ''): BuyLink[] {
  const q = encodeURIComponent(`${title} ${author}`.trim())
  return [
    { platform: 'Amazon', kind: 'nuovo', color: '#FF9900', url: `https://www.amazon.it/s?k=${q}&i=stripbooks` },
    { platform: 'IBS', kind: 'nuovo', color: '#0B5FA5', url: `https://www.ibs.it/search/?ts=as&query=${q}` },
    { platform: 'Mondadori', kind: 'nuovo', color: '#D81E27', url: `https://www.mondadoristore.it/search/?g=${q}&t=Tutto` },
    { platform: 'Libraccio', kind: 'usato', color: '#E30613', url: `https://www.libraccio.it/libri/cerca?q=${q}` },
    { platform: 'eBay', kind: 'usato', color: '#0064D2', url: `https://www.ebay.it/sch/i.html?_nkw=${q}&_sacat=267` },
    { platform: 'AbeBooks', kind: 'collezione', color: '#C8102E', url: `https://www.abebooks.it/servlet/SearchResults?kn=${q}` },
    { platform: 'Catawiki', kind: 'collezione', color: '#00B2A9', url: `https://www.catawiki.com/it/l/libri?q=${q}` },
  ]
}
