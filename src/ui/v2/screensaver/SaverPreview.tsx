import '@fontsource-variable/archivo/wdth.css'
import './screensaver.css'
import { useLayoutEffect, useRef, useState } from 'react'
import type { SaverLayout, SaverTheme } from '../../../state/useSettings.ts'
import { useNow } from '../lib/useNow.ts'
import { SaverScene } from './SaverScene.tsx'
import { paletteFor } from './themes.ts'
import { useSaverData } from './useSaverData.ts'

/** The real scene, laid out at 1280×720 and scaled down to fit (Settings). */
const STAGE_W = 1280
const STAGE_H = 720

export default function SaverPreview({
  theme,
  layout,
  widgets,
  seconds,
}: {
  theme: SaverTheme
  layout: SaverLayout
  widgets: boolean
  seconds: boolean
}) {
  const data = useSaverData()
  const hour = useNow(60_000).getHours()
  const box = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.4)

  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const measure = () => setScale(el.clientWidth / STAGE_W || 0.4)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={box}
      className="saver-preview"
      style={{ aspectRatio: `${STAGE_W} / ${STAGE_H}` }}
    >
      <div
        className="saver-preview__stage"
        style={{
          width: STAGE_W,
          height: STAGE_H,
          transform: `scale(${scale})`,
        }}
      >
        <SaverScene
          data={data}
          palette={paletteFor(theme, hour)}
          layout={layout}
          widgets={widgets}
          seconds={seconds}
        />
      </div>
    </div>
  )
}
