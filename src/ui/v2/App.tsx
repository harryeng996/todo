import { useEffect, useRef } from 'react'
import { PomodoroProvider } from '../../state/PomodoroContext.tsx'
import { QuoteProvider } from '../../state/QuoteContext.tsx'
import { TodoProvider } from '../../state/TodoContext.tsx'
import { usePomodoro } from '../../state/usePomodoro.ts'
import { VideoProvider } from '../../state/VideoContext.tsx'
import { WeightProvider } from '../../state/WeightContext.tsx'
import { ConfettiProvider } from './components/Confetti.tsx'
import { useConfetti } from './components/confettiContext.ts'
import { ToastProvider } from './components/Toast.tsx'
import { ComingSoon } from './screens/ComingSoon.tsx'
import { HomeScreen } from './screens/home/HomeScreen.tsx'
import { SettingsScreen } from './screens/settings/SettingsScreen.tsx'
import { Shell } from './shell/Shell.tsx'
import { AppSettingsProvider, TargetsProvider } from './state/AppProviders.tsx'

const screens = {
  home: () => <HomeScreen />,
  tasks: () => <ComingSoon title="Tasks" />,
  focus: () => <ComingSoon title="Focus" />,
  body: () => <ComingSoon title="Body" />,
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
                      <CelebrateSessions />
                      <Shell screens={screens} />
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
