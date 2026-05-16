'use client'
import { useState, useRef, useEffect } from 'react'
import { Play, Pause, RotateCcw, RotateCw, Volume2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AudioPlayerProps {
  audioUrl?: string
  script?: string
  bookTitle?: string
}

export function AudioPlayer({ audioUrl, script, bookTitle }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)

  const BARS = 24

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onTime = () => { setCurrentTime(audio.currentTime); setProgress(audio.currentTime / audio.duration) }
    const onLoad = () => setDuration(audio.duration)
    const onEnd = () => { setPlaying(false); setProgress(0) }
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('loadedmetadata', onLoad)
    audio.addEventListener('ended', onEnd)
    return () => { audio.removeEventListener('timeupdate', onTime); audio.removeEventListener('loadedmetadata', onLoad); audio.removeEventListener('ended', onEnd) }
  }, [])

  const toggle = () => {
    const audio = audioRef.current
    if (!audio) return
    playing ? audio.pause() : audio.play()
    setPlaying(!playing)
  }

  const skip = (secs: number) => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = Math.max(0, Math.min(audio.duration, audio.currentTime + secs))
  }

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current
    if (!audio) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = (e.clientX - rect.left) / rect.width
    audio.currentTime = pct * audio.duration
  }

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

  return (
    <div className="rounded-3xl overflow-hidden" style={{ background: 'var(--forest-darker)', color: 'var(--cream)' }}>
      {audioUrl && <audio ref={audioRef} src={audioUrl} preload="metadata" />}

      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(245,241,232,0.1)' }}>
            <Volume2 size={18} style={{ color: 'var(--accent-amber)' }} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--accent-amber)' }}>Trailer Audio AI</p>
            <p className="text-sm font-semibold">{bookTitle ?? 'Trailer'}</p>
          </div>
        </div>

        {/* Waveform */}
        <div className="flex items-center justify-center gap-[3px] h-16 mb-6">
          {Array.from({ length: BARS }).map((_, i) => {
            const heights = [30, 50, 80, 60, 90, 40, 70, 55, 85, 45, 75, 35, 65, 50, 80, 60, 40, 75, 55, 90, 35, 65, 45, 70]
            const h = heights[i % heights.length]
            const filled = (i / BARS) < progress
            return (
              <div
                key={i}
                className="rounded-full transition-all duration-150"
                style={{
                  width: 3,
                  height: `${h}%`,
                  background: filled ? 'var(--accent-amber)' : 'rgba(245,241,232,0.2)',
                  animation: playing && filled ? `waveBar ${0.8 + (i % 4) * 0.15}s ease-in-out infinite` : 'none',
                  animationDelay: `${(i % 4) * 0.1}s`,
                }}
              />
            )
          })}
        </div>

        {/* Progress bar */}
        <div className="mb-3">
          <div
            className="h-1 rounded-full cursor-pointer"
            style={{ background: 'rgba(245,241,232,0.15)' }}
            onClick={seek}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${progress * 100}%`, background: 'var(--accent-amber)' }}
            />
          </div>
          <div className="flex justify-between mt-1.5 text-xs" style={{ color: 'rgba(245,241,232,0.5)' }}>
            <span>{fmt(currentTime)}</span>
            <span>{duration ? fmt(duration) : '~1:30'}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-6">
          <button onClick={() => skip(-10)} className="p-2 rounded-full hover:bg-white/10 transition-colors">
            <RotateCcw size={20} style={{ color: 'rgba(245,241,232,0.7)' }} />
          </button>
          <button
            onClick={toggle}
            disabled={!audioUrl}
            className={cn('w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg', !audioUrl && 'opacity-50 cursor-not-allowed')}
            style={{ background: 'var(--accent-amber)' }}
          >
            {playing ? <Pause size={24} style={{ color: 'var(--ink)' }} /> : <Play size={24} style={{ color: 'var(--ink)', marginLeft: 2 }} />}
          </button>
          <button onClick={() => skip(10)} className="p-2 rounded-full hover:bg-white/10 transition-colors">
            <RotateCw size={20} style={{ color: 'rgba(245,241,232,0.7)' }} />
          </button>
        </div>

        {!audioUrl && script && (
          <div className="mt-6 p-4 rounded-2xl text-sm leading-relaxed" style={{ background: 'rgba(245,241,232,0.05)', color: 'rgba(245,241,232,0.7)' }}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--accent-amber)' }}>Script generato</p>
            <p>{script}</p>
          </div>
        )}
      </div>
    </div>
  )
}
