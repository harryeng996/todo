import type { SaverTheme } from '../../../state/useSettings.ts'

export type PaletteId = Exclude<SaverTheme, 'auto'>

export interface Palette {
  id: PaletteId
  label: string
  /** Colour behind the glow. */
  base: string
  /** Four soft light sources drifting around. */
  glow: readonly [string, string, string, string]
  /** Text and chart colour. */
  ink: string
  /** Glass widgets: a light tint on dark palettes, more opaque on light ones. */
  glass: string
  /** Dimmer, calmer content (late at night). */
  night?: boolean
}

export const PALETTES: Record<PaletteId, Palette> = {
  dusk: {
    id: 'dusk',
    label: 'Dusk',
    base: '#3b1c7a',
    glow: ['#ff6b3d', '#ff3d9a', '#8a4dff', '#3d74ff'],
    ink: '#ffffff',
    glass: 'rgb(255 255 255 / 0.14)',
  },
  ocean: {
    id: 'ocean',
    label: 'Ocean',
    base: '#062a52',
    glow: ['#00c8ff', '#2e5bff', '#00e2b0', '#7a5cff'],
    ink: '#ffffff',
    glass: 'rgb(255 255 255 / 0.13)',
  },
  forest: {
    id: 'forest',
    label: 'Forest',
    base: '#0b3328',
    glow: ['#1fc489', '#7ccf5a', '#0b8f8f', '#2f7d5a'],
    ink: '#ffffff',
    glass: 'rgb(255 255 255 / 0.13)',
  },
  sunrise: {
    id: 'sunrise',
    label: 'Sunrise',
    base: '#ffc9a3',
    glow: ['#ffd36e', '#ff7f5c', '#ff9ec8', '#fff1d6'],
    ink: '#3a1a10',
    glass: 'rgb(255 255 255 / 0.38)',
  },
  graphite: {
    id: 'graphite',
    label: 'Graphite',
    base: '#0e0f12',
    glow: ['#2f3442', '#1d2029', '#4a4458', '#262b36'],
    ink: '#e9e7f0',
    glass: 'rgb(255 255 255 / 0.07)',
    night: true,
  },
}

export const PALETTE_IDS = Object.keys(PALETTES) as PaletteId[]

/** 'auto': sunrise in the morning, ocean by day, dusk in the evening, graphite at night. */
export function paletteFor(theme: SaverTheme, hour: number): Palette {
  if (theme !== 'auto') return PALETTES[theme]
  if (hour >= 5 && hour < 10) return PALETTES.sunrise
  if (hour >= 10 && hour < 17) return PALETTES.ocean
  if (hour >= 17 && hour < 21) return PALETTES.dusk
  return PALETTES.graphite
}

/** A round swatch of a palette's glow, for the theme picker. */
export function swatch(id: PaletteId): string {
  const p = PALETTES[id]
  return `radial-gradient(circle at 30% 30%, ${p.glow[0]}, transparent 62%), radial-gradient(circle at 75% 72%, ${p.glow[2]}, transparent 62%), radial-gradient(circle at 70% 25%, ${p.glow[1]}, transparent 55%), ${p.base}`
}
