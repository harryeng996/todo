import { motion } from 'motion/react'
import { useId } from 'react'
import { linear, smoothPath } from './scale.ts'

interface SparklineProps {
  values: readonly number[]
  width?: number
  height?: number
  color?: string
  fromZero?: boolean
}

/** A tiny trend line with a soft fill, for stat tiles. */
export function Sparkline({
  values,
  width = 96,
  height = 36,
  color = 'var(--accent)',
  fromZero = true,
}: SparklineProps) {
  const gradient = useId()
  if (values.length < 2) return null
  const min = fromZero ? Math.min(0, ...values) : Math.min(...values)
  const max = Math.max(...values, min + 1)
  const x = linear([0, values.length - 1], [2, width - 2])
  const y = linear([min, max], [height - 3, 3])
  const points = values.map((v, i) => ({ x: x(i), y: y(v) }))
  const line = smoothPath(points)
  const area = `${line} L${points.at(-1)!.x},${height} L${points[0].x},${height} Z`

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      className="sparkline"
    >
      <defs>
        <linearGradient id={gradient} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.28" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path
        d={area}
        fill={`url(#${gradient})`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.3 }}
      />
      <motion.path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      />
      <circle
        cx={points.at(-1)!.x}
        cy={points.at(-1)!.y}
        r={2.5}
        fill={color}
      />
    </svg>
  )
}
