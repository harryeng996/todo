import type { ReactNode } from 'react'
import type { PosterId } from '../../../state/useSettings.ts'
import {
  DefinitionPoster,
  QuotePoster,
  RetroPoster,
  SketchPoster,
  StatementPoster,
  type PosterProps,
} from './Posters.tsx'

export const POSTERS: Record<
  PosterId,
  { label: string; Component: (props: PosterProps) => ReactNode }
> = {
  statement: { label: 'Statement', Component: StatementPoster },
  definition: { label: 'Definition', Component: DefinitionPoster },
  retro: { label: 'Retro print', Component: RetroPoster },
  sketch: { label: 'Sketch', Component: SketchPoster },
  quote: { label: 'Quote', Component: QuotePoster },
}
