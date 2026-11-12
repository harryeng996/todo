import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { linear, niceTicks } from './scale.ts'
import { useWidth } from './useWidth.ts'

export interface Bar {
  key: string
  /** Short label under the bar; leave empty to skip. */
  label: string
  /** Tooltip heading. */
  title: string
  value: number
  highlight?: boolean
}

interface BarChartProps {
  bars: readonly Bar[]
  format: (value: number) => string
  color?: string
  height?: number
  label: string
  /** Draw a dashed line at this value (e.g. the average). */
  reference?: { value: number; label: string }
  onSelect?: (key: string) => void
}

const PAD = { top: 14, right: 8, bottom: 24, left: 36 }

export function BarChart({
  bars,
  format,
  color = 'var(--accent)',
  height = 200,
  label,
  reference,
  onSelect,
}: BarChartProps) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const max = Math.max(1, ...bars.map((b) => b.value), reference?.value ?? 0)
  const ticks = niceTicks(0, max, 3)
  const y = linear([0, ticks.at(-1)!], [height - PAD.bottom, PAD.top])
  const slot = (width - PAD.left - PAD.right) / Math.max(bars.length, 1)
  const barW = Math.max(2, Math.min(28, slot * 0.62))
  const labelEvery = Math.max(1, Math.ceil(bars.length / 12))
  const hovered = hover !== null ? bars[hover] : null

  return (
    <div ref={ref} className="chart">
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={label}
        onPointerLeave={() => setHover(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={PAD.left}
              x2={width - PAD.right}
              y1={y(t)}
              y2={y(t)}
              className="chart__grid"
            />
            <text
              x={PAD.left - 8}
              y={y(t)}
              className="chart__tick"
              textAnchor="end"
              dominantBaseline="middle"
            >
              {format(t)}
            </text>
          </g>
        ))}
        {bars.map((bar, i) => {
          const cx = PAD.left + slot * (i + 0.5)
          const h = Math.max(
            bar.value > 0 ? 3 : 0,
            height - PAD.bottom - y(bar.value),
          )
          return (
            <g
              key={bar.key}
              onPointerEnter={() => setHover(i)}
              onPointerDown={() => setHover(i)}
              onClick={onSelect ? () => onSelect(bar.key) : undefined}
              style={{ cursor: onSelect ? 'pointer' : undefined }}
            >
              <rect
                x={cx - slot / 2}
                y={PAD.top}
                width={slot}
                height={height - PAD.top - PAD.bottom}
                fill="transparent"
              />
              <motion.rect
                x={cx - barW / 2}
                width={barW}
                rx={Math.min(6, barW / 2)}
                fill={color}
                opacity={
                  hover === null || hover === i
                    ? bar.highlight
                      ? 1
                      : 0.85
                    : 0.4
                }
                initial={{ height: 0, y: height - PAD.bottom }}
                animate={{ height: h, y: height - PAD.bottom - h }}
                transition={{
                  duration: 0.6,
                  delay: Math.min(i * 0.015, 0.4),
                  ease: [0.22, 1, 0.36, 1],
                }}
              />
              {bar.label && i % labelEvery === 0 && (
                <text
                  x={cx}
                  y={height - 6}
                  textAnchor="middle"
                  className={`chart__tick ${bar.highlight ? 'chart__tick--strong' : ''}`}
                >
                  {bar.label}
                </text>
              )}
            </g>
          )
        })}
        {reference && reference.value > 0 && (
          <g className="chart__reference">
            <line
              x1={PAD.left}
              x2={width - PAD.right}
              y1={y(reference.value)}
              y2={y(reference.value)}
            />
            <text
              x={PAD.left + 4}
              y={y(reference.value) - 5}
              textAnchor="start"
            >
              {reference.label}
            </text>
          </g>
        )}
      </svg>
      <AnimatePresence>
        {hovered && hover !== null && (
          <motion.div
            className="chart__tooltip"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            style={{
              left: Math.min(
                Math.max(PAD.left + slot * (hover + 0.5), 60),
                width - 60,
              ),
              top: Math.max(y(hovered.value) - 12, 0),
            }}
          >
            <strong className="num">{format(hovered.value)}</strong>
            <span>{hovered.title}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
