import { useMemo } from 'react'
import { usePomodoro } from '../../../state/usePomodoro.ts'
import { useQuoteLibrary } from '../../../state/useQuoteLibrary.ts'
import { useTodos } from '../../../state/useTodos.ts'
import { useToday } from '../../../state/useToday.ts'
import { useWeights } from '../../../state/useWeights.ts'
import { useAppSettings, useTargetList } from '../state/appContext.ts'
import { buildSaverData, type SaverData } from './saverData.ts'

/** Everything the screensaver shows, recomputed only when the data changes. */
export function useSaverData(): SaverData {
  const today = useToday()
  const { todos } = useTodos()
  const { sessions } = usePomodoro()
  const { log } = useWeights()
  const { current } = useQuoteLibrary()
  const { targets } = useTargetList()
  const { settings } = useAppSettings()
  return useMemo(
    () =>
      buildSaverData({
        today,
        todos,
        sessions,
        log,
        unit: settings.weightUnit,
        weightTracking: settings.weightTracking,
        pomodoro: settings.pomodoro,
        quote: current,
        targets,
      }),
    [
      today,
      todos,
      sessions,
      log,
      settings.weightUnit,
      settings.weightTracking,
      settings.pomodoro,
      current,
      targets,
    ],
  )
}
