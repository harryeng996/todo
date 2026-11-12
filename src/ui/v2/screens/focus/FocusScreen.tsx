import { formatLongDate } from '../../../../lib/date.ts'
import { phaseLabel } from '../../../../state/pomodoro.ts'
import { usePomodoro } from '../../../../state/usePomodoro.ts'
import { useToday } from '../../../../state/useToday.ts'
import { ScreenBody, ScreenHeader } from '../../components/Card.tsx'
import { useAppSettings } from '../../state/appContext.ts'
import { FocusStats } from './FocusStats.tsx'
import { TimerStage } from './TimerStage.tsx'
import { TodayTimeline } from './TodayTimeline.tsx'
import { VideoCard } from './VideoCard.tsx'

export function FocusScreen() {
  const today = useToday()
  const { settings } = useAppSettings()
  const { timer } = usePomodoro()

  let subtitle = 'Pick a task, start the timer, and let everything else wait.'
  if (timer.status === 'running')
    subtitle = timer.taskTitle
      ? `${phaseLabel(timer.phase)} on “${timer.taskTitle}”.`
      : `${phaseLabel(timer.phase)} in progress.`
  else if (timer.status === 'paused')
    subtitle = 'Paused. Resume when you’re ready.'

  return (
    <ScreenBody>
      <ScreenHeader
        eyebrow={formatLongDate(today)}
        title="Focus"
        subtitle={subtitle}
      />
      <div
        className={`focus-layout ${settings.pomodoro ? '' : 'focus-layout--video-only'}`}
      >
        {settings.pomodoro && <TimerStage />}
        <div className="focus-layout__side">
          {settings.youtube && <VideoCard />}
          {settings.pomodoro && <TodayTimeline />}
        </div>
      </div>
      {settings.pomodoro && <FocusStats />}
    </ScreenBody>
  )
}
