'use client'

// Torta (ad anello) per le ripartizioni del cruscotto vendite.
// L'anello dà il colpo d'occhio parte-tutto; i numeri veri stanno nelle righe
// sotto, che fanno anche da legenda. Toccando un settore lo si isola.

export interface DonutSlice {
  key: string
  label: string
  value: number
  color: string
}

const SIZE = 168
const STROKE = 24
const GAP = 2          // spazio di superficie tra un settore e l'altro
const RADIUS = (SIZE - STROKE) / 2
const CIRC = 2 * Math.PI * RADIUS

export function DonutChart({
  slices,
  selected,
  onSelect,
  centerLabel,
  centerValue,
  centerSub,
  ariaLabel,
}: {
  slices: DonutSlice[]
  selected: string | null
  onSelect: (key: string | null) => void
  centerLabel: string
  centerValue: string
  centerSub?: string
  ariaLabel: string
}) {
  const total = slices.reduce((s, x) => s + x.value, 0)
  // Lunghezza di ogni arco e punto di partenza, calcolati prima di disegnare.
  const lengths = slices.map(s => (total > 0 ? (s.value / total) * CIRC : 0))
  const starts = lengths.map((_, i) => lengths.slice(0, i).reduce((a, b) => a + b, 0))

  return (
    <div className="relative flex-shrink-0" style={{ width: SIZE, height: SIZE }}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={ariaLabel}>
        <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
          {/* Traccia di fondo: si vede solo se non c'è ancora nulla da mostrare */}
          <circle
            cx={SIZE / 2} cy={SIZE / 2} r={RADIUS}
            fill="none" stroke="var(--cream-3)" strokeWidth={STROKE}
          />
          {slices.map((s, i) => {
            const len = lengths[i]
            const visible = Math.max(len - GAP, len > 0 ? 1.5 : 0)
            const dash = `${visible} ${CIRC - visible}`
            const dashOffset = -starts[i]
            const dimmed = selected !== null && selected !== s.key
            return (
              <g key={s.key}>
                <circle
                  cx={SIZE / 2} cy={SIZE / 2} r={RADIUS}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={selected === s.key ? STROKE + 6 : STROKE}
                  strokeDasharray={dash}
                  strokeDashoffset={dashOffset}
                  opacity={dimmed ? 0.3 : 1}
                  style={{ transition: 'opacity 0.15s, stroke-width 0.15s' }}
                />
                {/* Area di tocco più larga del segno disegnato */}
                <circle
                  cx={SIZE / 2} cy={SIZE / 2} r={RADIUS}
                  fill="none" stroke="transparent" strokeWidth={STROKE + 14}
                  strokeDasharray={dash} strokeDashoffset={dashOffset}
                  style={{ cursor: 'pointer' }}
                  onClick={() => onSelect(selected === s.key ? null : s.key)}
                />
              </g>
            )
          })}
        </g>
      </svg>

      {/* Centro: totale del periodo, o il settore scelto */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-6 text-center">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)] leading-tight truncate max-w-full">
          {centerLabel}
        </span>
        <span className="font-serif text-xl font-semibold text-[var(--ink)] leading-tight">{centerValue}</span>
        {centerSub && <span className="text-[10px] text-[var(--muted)] leading-tight">{centerSub}</span>}
      </div>
    </div>
  )
}
