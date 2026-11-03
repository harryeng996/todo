import { Settings as SettingsIcon } from 'lucide-react'
import { useState } from 'react'
import { Clock } from './components/clock/Clock.tsx'
import { Countdown } from './components/clock/Countdown.tsx'
import { DayGrid } from './components/grid/DayGrid.tsx'
import { MusicPlayer } from './components/music/MusicPlayer.tsx'
import { QuoteCard } from './components/quotes/QuoteCard.tsx'
import {
  SettingsDialog,
  type SettingsSection,
} from './components/settings/SettingsDialog.tsx'
import { SketchBox } from './components/sketch/SketchBox.tsx'
import { SketchButton } from './components/sketch/SketchButton.tsx'
import { TodoPanel } from './components/todo/TodoPanel.tsx'
import { WeightPanel } from './components/weight/WeightPanel.tsx'
import { YouTubePanel } from './components/youtube/YouTubePanel.tsx'
import { MUSIC_PLAYER_ENABLED } from './features.ts'
import { QuoteProvider } from './state/QuoteContext.tsx'
import { TodoProvider } from './state/TodoContext.tsx'
import { useSettings } from './state/useSettings.ts'
import { useToday } from './state/useToday.ts'
import { WeightProvider } from './state/WeightContext.tsx'

function Page() {
  const today = useToday()
  const [selectedDate, setSelectedDate] = useState(today)
  const [settings, updateSettings] = useSettings()
  const [settingsOpen, setSettingsOpen] = useState<SettingsSection | false>(
    false,
  )
  const showMusic = MUSIC_PLAYER_ENABLED && settings.music
  const showMedia = showMusic || settings.youtube

  // At midnight: if today was selected, follow the new today.
  const [previousToday, setPreviousToday] = useState(today)
  if (today !== previousToday) {
    setPreviousToday(today)
    if (selectedDate === previousToday) setSelectedDate(today)
  }

  return (
    // Wide screens: to-do list | clock, grid, quote, media | weight (see app.css).
    <main className={settings.weightTracking ? 'page' : 'page page--no-weight'}>
      <SketchBox seed={43} className="page__todo">
        <TodoPanel
          selectedDate={selectedDate}
          today={today}
          onBackToToday={() => setSelectedDate(today)}
        />
      </SketchBox>
      <div className="page__center">
        <header className="page__clock">
          <div className="page__clock-row">
            <Clock />
            <SketchButton
              variant="ghost"
              onClick={() => setSettingsOpen('general')}
              aria-label="Settings"
              title="Settings"
            >
              <SettingsIcon size={24} strokeWidth={1.75} aria-hidden="true" />
            </SketchButton>
          </div>
          <Countdown today={today} />
        </header>
        {/* Grid (last 6 months) on the left, the quote beside it. */}
        <div className="page__grid-row">
          <SketchBox seed={42} className="page__grid">
            <DayGrid
              today={today}
              selectedDate={selectedDate}
              onSelect={setSelectedDate}
            />
          </SketchBox>
          <div className="page__quote">
            <QuoteCard onConfigure={() => setSettingsOpen('quotes')} />
          </div>
        </div>
        {showMedia && (
          <div className="page__media">
            {showMusic && <MusicPlayer />}
            {/* Renders two boxes: the player and its list of links. */}
            {settings.youtube && <YouTubePanel />}
          </div>
        )}
      </div>
      {settings.weightTracking && (
        <SketchBox seed={47} className="page__weight">
          <WeightPanel
            selectedDate={selectedDate}
            today={today}
            unit={settings.weightUnit}
          />
        </SketchBox>
      )}
      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onChange={updateSettings}
        showMusic={MUSIC_PLAYER_ENABLED}
      />
    </main>
  )
}

export default function App() {
  return (
    <TodoProvider>
      <WeightProvider>
        <QuoteProvider>
          <Page />
        </QuoteProvider>
      </WeightProvider>
    </TodoProvider>
  )
}
