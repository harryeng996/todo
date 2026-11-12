import { motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { usePhotoUrl, type PhotoSize } from '../../../hooks/usePhotoUrl.ts'
import type { PhotoKey } from '../../../lib/weight.ts'

interface ThumbProps {
  photo: PhotoKey
  alt: string
  size?: PhotoSize
  className?: string
}

/** A photo that only loads once it is near the viewport, with a shimmer until then. */
export function Thumb({
  photo,
  alt,
  size = 'thumb',
  className = '',
}: ThumbProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [near, setNear] = useState(typeof IntersectionObserver === 'undefined')

  useEffect(() => {
    const el = ref.current
    if (!el || near) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNear(true)
          observer.disconnect()
        }
      },
      { rootMargin: '300px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [near])

  const url = usePhotoUrl(near ? photo : null, size)

  return (
    <div ref={ref} className={`thumb ${url ? '' : 'is-loading'} ${className}`}>
      {url && (
        <motion.img
          src={url}
          alt={alt}
          draggable={false}
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35 }}
        />
      )}
    </div>
  )
}
