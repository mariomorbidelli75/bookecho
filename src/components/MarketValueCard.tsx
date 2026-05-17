import { TrendingUp, ExternalLink } from 'lucide-react'
import type { MarketData } from '@/types'
import { formatPrice } from '@/lib/utils'

const PLATFORM_COLORS: Record<string, string> = {
  eBay: '#E53238', Catawiki: '#FF6600', Vinted: '#09B1BA', Subito: '#FF0000', Instagram: '#E1306C',
}

interface MarketValueCardProps { data: MarketData }

export function MarketValueCard({ data }: MarketValueCardProps) {
  const maxPrice = Math.max(...data.sources.map(s => s.price), data.max)

  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-5" style={{ background: 'var(--forest)', color: 'var(--cream)' }}>
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp size={14} style={{ color: 'var(--accent-amber)' }} />
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--accent-amber)' }}>Stima valore di mercato</span>
        </div>
        <div className="flex items-end gap-3 mt-3">
          <div><p className="text-xs opacity-60">Da</p><p className="font-serif text-2xl font-semibold">{formatPrice(data.min)}</p></div>
          <div className="text-3xl font-light opacity-30 mb-1">→</div>
          <div><p className="text-xs opacity-60">Fino a</p><p className="font-serif text-2xl font-semibold">{formatPrice(data.max)}</p></div>
          <div className="ml-auto text-right"><p className="text-xs opacity-60">Media</p><p className="font-serif text-xl font-semibold" style={{ color: 'var(--accent-amber)' }}>{formatPrice(data.avg)}</p></div>
        </div>
        <div className="mt-4 h-2 rounded-full relative" style={{ background: 'rgba(245,241,232,0.1)' }}>
          <div className="h-full rounded-full" style={{ marginLeft: `${(data.min / maxPrice) * 100}%`, width: `${((data.max - data.min) / maxPrice) * 100}%`, background: 'var(--accent-amber)' }} />
          <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white" style={{ left: `${(data.avg / maxPrice) * 100}%`, background: 'var(--accent-amber)' }} />
        </div>
        <p className="text-xs opacity-50 mt-2">Aggiornato: {new Date(data.lastUpdated).toLocaleDateString('it-IT')}</p>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] px-1">Cerca su piattaforme</p>
        {data.sources.map((source, i) => (
          <a
            key={i}
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-xl transition-all active:scale-95"
            style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid var(--line)', cursor: source.url ? 'pointer' : 'default', display: 'flex' }}
          >
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PLATFORM_COLORS[source.platform] ?? '#888' }} />
            <span className="font-medium text-sm flex-1">{source.platform}</span>
            {source.condition && <span className="text-xs text-[var(--muted)]">{source.condition}</span>}
            <span className="font-serif font-semibold text-[var(--forest)]">{formatPrice(source.price)}</span>
            {source.url && <ExternalLink size={14} className="text-[var(--muted)]" />}
          </a>
        ))}
      </div>
    </div>
  )
}
