'use client'

import { useEffect, useRef } from 'react'

const VOCAB = [
  'Penetration',
  'AS1851',
  'FRL',
  'Fire collar',
  'Mastic',
  'Fire board',
  'Compliance',
  'Pin mapping',
  'Evidence',
]

const SPEED_PX_PER_SEC = 80

export function TradeVocabMarquee() {
  const trackRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const track = trackRef.current
    if (!track) return

    let copyWidth = 0
    let position = 0
    let lastTime: number | null = null
    let rafId = 0

    // Index of the first element of copy #2 (copy #1 has VOCAB.length × 2 elements).
    const copyTwoStartIndex = VOCAB.length * 2

    const measure = () => {
      const copyTwoStart = track.children[copyTwoStartIndex] as HTMLElement | undefined
      if (copyTwoStart) {
        copyWidth = copyTwoStart.offsetLeft
      }
    }

    const tick = (time: number) => {
      if (lastTime !== null && copyWidth > 0) {
        const dt = (time - lastTime) / 1000
        position -= SPEED_PX_PER_SEC * dt
        if (position <= -copyWidth) {
          position += copyWidth
        }
        track.style.transform = `translate3d(${position.toFixed(2)}px, 0, 0)`
      }
      lastTime = time
      rafId = requestAnimationFrame(tick)
    }

    const start = () => {
      measure()
      lastTime = null
      rafId = requestAnimationFrame(tick)
    }

    if (typeof document !== 'undefined' && document.fonts && document.fonts.status !== 'loaded') {
      document.fonts.ready.then(start)
    } else {
      start()
    }

    const onResize = () => measure()
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return (
    <section className="grain relative overflow-hidden bg-slate-900 py-6">
      <div
        ref={trackRef}
        className="flex items-center whitespace-nowrap text-[clamp(1rem,2.5vw,1.75rem)] font-semibold uppercase tracking-tight text-slate-100"
        style={{ transform: 'translate3d(0, 0, 0)', willChange: 'transform' }}
      >
        {Array.from({ length: 2 }, (_, copyIdx) =>
          VOCAB.flatMap((word, wordIdx) => [
            <span key={`${copyIdx}-${wordIdx}-w`} className="mr-8 shrink-0">
              {word}
            </span>,
            <span key={`${copyIdx}-${wordIdx}-s`} className="mr-8 shrink-0 text-blue-400">
              ·
            </span>,
          ]),
        ).flat()}
      </div>
    </section>
  )
}
