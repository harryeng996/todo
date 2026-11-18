import { useEffect, useRef } from 'react'
import {
  formatCountdown,
  phaseLabel,
  phaseMs,
  remainingMs,
} from '../../state/pomodoro.ts'
import { PomodoroProvider } from '../../state/PomodoroContext.tsx'
import { QuoteProvider } from '../../state/QuoteContext.tsx'
import { TodoProvider } from '../../state/TodoContext.tsx'
import { usePomodoro } from '../../state/usePomodoro.ts'
import { VideoProvider } from '../../state/VideoContext.tsx'
import { WeightProvider } from '../../state/WeightContext.tsx'
import { ConfettiProvider } from './components/Confetti.tsx'
import { useConfetti } from './components/confettiContext.ts'
import { ToastProvider } from './components/Toast.tsx'
import { BodyScreen } from './screens/body/BodyScreen.tsx'
import { FocusScreen } from './screens/focus/FocusScreen.tsx'
import { HomeScreen } from './screens/home/HomeScreen.tsx'
import { SettingsScreen } from './screens/settings/SettingsScreen.tsx'
import { TasksScreen } from './screens/tasks/TasksScreen.tsx'
import { Shell } from './shell/Shell.tsx'
import { ScreensaverProvider } from './shell/ScreensaverProvider.tsx'
import { VideoDockProvider } from './shell/VideoDock.tsx'
import { useNow } from './lib/useNow.ts'
import { AppSettingsProvider, TargetsProvider } from './state/AppProviders.tsx'

const screens = {
  home: () => <HomeScreen />,
  tasks: () => <TasksScreen />,
  focus: () => <FocusScreen />,
  body: () => <BodyScreen />,
  settings: () => <SettingsScreen />,
}

/** Confetti whenever a focus session is finished while the app is open. */
function CelebrateSessions() {
  const { sessions } = usePomodoro()
  const confetti = useConfetti()
  const count = useRef(sessions.length)
  useEffect(() => {
    if (sessions.length > count.current) confetti()
    count.current = sessions.length
  }, [sessions.length, confetti])
  return null
}

const BASE_TITLE = document.title

/** While the timer runs, the tab title shows the countdown (as in v1). */
function TitleTicker() {
  const { timer, config } = usePomodoro()
  const running = timer.status === 'running'
  const now = useNow(1000, running)
  const left = Math.min(
    remainingMs(timer, now.getTime()),
    phaseMs(timer.phase, config),
  )
  const title = running
    ? `${formatCountdown(left)} · ${phaseLabel(timer.phase)}`
    : BASE_TITLE
  useEffect(() => {
    document.title = title
  }, [title])
  // Timer icons tick while it runs (styles/icons.css).
  useEffect(() => {
    const root = document.documentElement
    if (running) root.dataset.timer = 'running'
    else delete root.dataset.timer
    return () => {
      delete root.dataset.timer
    }
  }, [running])
  return null
}

export default function App() {
  return (
    <AppSettingsProvider>
      <TodoProvider>
        <WeightProvider>
          <QuoteProvider>
            <VideoProvider>
              <PomodoroProvider>
                <TargetsProvider>
                  <ToastProvider>
                    <ConfettiProvider>
                      <VideoDockProvider>
                        <CelebrateSessions />
                        <TitleTicker />
                        <ScreensaverProvider>
                          <Shell screens={screens} />
                        </ScreensaverProvider>
                      </VideoDockProvider>
                    </ConfettiProvider>
                  </ToastProvider>
                </TargetsProvider>
              </PomodoroProvider>
            </VideoProvider>
          </QuoteProvider>
        </WeightProvider>
      </TodoProvider>
    </AppSettingsProvider>
  )
}
