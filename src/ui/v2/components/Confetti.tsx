import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useState, type ReactNode } from 'react'
import { useAppSettings } from '../state/appContext.ts'
import { ConfettiContext } from './confettiContext.ts'

const COLORS = [
  'var(--accent)',
  'var(--focus)',
  'var(--break)',
  'var(--warn)',
  'var(--body)',
]

interface Piece {
  id: number
  x: number
  y: number
  rotate: number
  color: string
  w: number
  h: number
  delay: number
}

let burstId = 0

function makeBurst(): Piece[] {
  return Array.from({ length: 36 }, (_, i) => {
    const angle = (Math.PI * 2 * i) / 36 + Math.random() * 0.4
    const distance = 140 + Math.random() * 180
    return {
      id: i,
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance * 0.7 - 80,
      rotate: Math.random() * 720 - 360,
      color: COLORS[i % COLORS.length],
      w: 6 + Math.random() * 6,
      h: 8 + Math.random() * 8,
      delay: Math.random() * 0.08,
    }
  })
}

/** A celebratory burst from the middle of the screen; skipped when motion is reduced. */
export function ConfettiProvider({ children }: { children: ReactNode }) {
  const { reducedMotion } = useAppSettings()
  const [bursts, setBursts] = useState<{ id: number; pieces: Piece[] }[]>([])

  const fire = useCallback(() => {
    if (reducedMotion) return
    const id = ++burstId
    setBursts((list) => [...list, { id, pieces: makeBurst() }])
    setTimeout(() => setBursts((list) => list.filter((b) => b.id !== id)), 1800)
  }, [reducedMotion])

  return (
    <ConfettiContext value={fire}>
      {children}
      <div className="confetti" aria-hidden="true">
        <AnimatePresence>
          {bursts.map((burst) =>
            burst.pieces.map((p) => (
              <motion.span
                key={`${burst.id}-${p.id}`}
                className="confetti__piece"
                style={{ background: p.color, width: p.w, height: p.h }}
                initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0.4 }}
                animate={{
                  x: p.x,
                  y: [0, p.y, p.y + 260],
                  opacity: [1, 1, 0],
                  rotate: p.rotate,
                  scale: 1,
                }}
                transition={{
                  duration: 1.6,
                  delay: p.delay,
                  ease: [0.16, 0.8, 0.4, 1],
                  times: [0, 0.45, 1],
                }}
              />
            )),
          )}
        </AnimatePresence>
      </div>
    </ConfettiContext>
  )
}
