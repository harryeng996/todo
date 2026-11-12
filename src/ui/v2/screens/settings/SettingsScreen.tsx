import {
  Database,
  Monitor,
  Moon,
  MonitorPlay,
  Palette,
  Quote,
  Sun,
  Target,
  Timer,
  ToggleRight,
  type LucideIcon,
} from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { formatWeight } from '../../../../lib/weight.ts'
import { switchUiVersion } from '../../../../state/useSettings.ts'
import { Button } from '../../components/Button.tsx'
import { Card, ScreenBody, ScreenHeader } from '../../components/Card.tsx'
import { Segmented } from '../../components/Segmented.tsx'
import { Switch } from '../../components/Switch.tsx'
import { navigate, replaceRoute, useRoute } from '../../lib/router.ts'
import { useAppSettings } from '../../state/appContext.ts'
import { useWeightGoal } from '../../state/weightGoal.ts'
import { DataSettings } from './DataSettings.tsx'
import { PomodoroSettings } from './PomodoroSettings.tsx'
import { QuoteSettings } from './QuoteSettings.tsx'
import { TargetSettings } from './TargetSettings.tsx'
import { VideoSettings } from './VideoSettings.tsx'

interface Section {
  id: string
  label: string
  icon: LucideIcon
}

const sectionId = (id: string) => `settings-${id}`

export function SettingsScreen() {
  const { settings } = useAppSettings()
  const route = useRoute()
  const sections: Section[] = [
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'features', label: 'Features', icon: ToggleRight },
    { id: 'targets', label: 'Targets', icon: Target },
    ...(settings.pomodoro
      ? [{ id: 'pomodoro', label: 'Pomodoro', icon: Timer }]
      : []),
    { id: 'quotes', label: 'Quotes', icon: Quote },
    ...(settings.youtube
      ? [{ id: 'videos', label: 'Videos', icon: MonitorPlay }]
      : []),
    { id: 'data', label: 'Data', icon: Database },
  ]
  const [active, setActive] = useState(route.section ?? 'appearance')

  // Opened at a section (e.g. from the quote card): scroll to it once laid out.
  useEffect(() => {
    if (!route.section) return
    const timer = setTimeout(() => {
      document
        .getElementById(sectionId(route.section!))
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 60)
    return () => clearTimeout(timer)
  }, [route.section])

  // Highlight the section being read: the last one whose top has scrolled
  // past the upper part of the screen, or the last one at the very bottom.
  const ids = sections.map((x) => x.id).join(',')
  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      const list = ids.split(',')
      const atBottom =
        innerHeight + scrollY >= document.documentElement.scrollHeight - 4
      let current = list[0]
      for (const id of list) {
        const el = document.getElementById(sectionId(id))
        if (el && el.getBoundingClientRect().top <= innerHeight * 0.3)
          current = id
      }
      setActive(atBottom ? list.at(-1)! : current)
    }
    const onScroll = () => {
      frame ||= requestAnimationFrame(update)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [ids])

  function jump(id: string) {
    setActive(id)
    replaceRoute('settings', id)
    document
      .getElementById(sectionId(id))
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <ScreenBody>
      <ScreenHeader
        title="Settings"
        subtitle="Everything is saved in this browser only."
      />
      <div className="settings-layout">
        <nav className="settings-nav" aria-label="Settings sections">
          {sections.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className="settings-nav__item"
              aria-current={active === id ? 'true' : undefined}
              onClick={() => jump(id)}
            >
              {active === id && (
                <motion.span
                  layoutId="settings-nav"
                  className="settings-nav__active"
                  transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                />
              )}
              <Icon size={16} aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="settings-sections">
          <AppearanceSettings id={sectionId('appearance')} />
          <FeatureSettings id={sectionId('features')} />
          <TargetSettings id={sectionId('targets')} />
          {settings.pomodoro && <PomodoroSettings id={sectionId('pomodoro')} />}
          <QuoteSettings id={sectionId('quotes')} />
          {settings.youtube && <VideoSettings id={sectionId('videos')} />}
          <DataSettings id={sectionId('data')} />
        </div>
      </div>
    </ScreenBody>
  )
}

function AppearanceSettings({ id }: { id: string }) {
  const { settings, update } = useAppSettings()
  return (
    <Card
      id={id}
      icon={<Palette size={16} />}
      title="Appearance"
      subtitle="How the app looks and moves"
    >
      <div className="field-row">
        <div>
          <p className="field-row__label">Theme</p>
          <p className="field-row__hint">System follows your device setting.</p>
        </div>
        <Segmented
          label="Theme"
          value={settings.theme}
          onChange={(theme) => update({ theme })}
          options={[
            {
              value: 'light',
              label: (
                <>
                  <Sun size={15} /> Light
                </>
              ),
            },
            {
              value: 'dark',
              label: (
                <>
                  <Moon size={15} /> Dark
                </>
              ),
            },
            {
              value: 'system',
              label: (
                <>
                  <Monitor size={15} /> System
                </>
              ),
            },
          ]}
        />
      </div>
      <Switch
        id="setting-reduce-motion"
        label="Reduce motion"
        hint="Calmer transitions and no confetti; also follows your system setting."
        checked={settings.reduceMotion}
        onChange={(reduceMotion) => update({ reduceMotion })}
      />
      <Switch
        id="setting-ui-v2"
        label="Use the new interface (v2)"
        hint="Turn off to go back to the original sketch-style page. Your data stays the same; the page reloads."
        checked
        onChange={(on) => !on && switchUiVersion('v1')}
      />
    </Card>
  )
}

function FeatureSettings({ id }: { id: string }) {
  const { settings, update } = useAppSettings()
  const goal = useWeightGoal()
  return (
    <Card
      id={id}
      icon={<ToggleRight size={16} />}
      title="Features"
      subtitle="Turning one off only hides it. Your data is kept."
    >
      <Switch
        id="setting-pomodoro"
        label="Pomodoro timer"
        hint="The Focus screen's timer, sessions and statistics."
        checked={settings.pomodoro}
        onChange={(pomodoro) => update({ pomodoro })}
      />
      <Switch
        id="setting-youtube"
        label="YouTube videos"
        hint="A soundtrack on the Focus screen that keeps playing elsewhere."
        checked={settings.youtube}
        onChange={(youtube) => update({ youtube })}
      />
      <Switch
        id="setting-weight"
        label={
          <>
            Weight tracking <em className="chip chip--accent">Plus</em>
          </>
        }
        hint="The Body screen: weight, goal and progress photos. Stored only in this browser."
        checked={settings.weightTracking}
        onChange={(weightTracking) => update({ weightTracking })}
      />
      {settings.weightTracking && (
        <div className="field-row">
          <div>
            <p className="field-row__label">Weight unit</p>
            <p className="field-row__hint">
              {goal !== null
                ? `Goal ${formatWeight(goal, settings.weightUnit)} · `
                : ''}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('body')}
              >
                Open Body
              </Button>
            </p>
          </div>
          <Segmented
            label="Weight unit"
            value={settings.weightUnit}
            onChange={(weightUnit) => update({ weightUnit })}
            options={[
              { value: 'kg', label: 'Kilograms' },
              { value: 'lb', label: 'Pounds' },
            ]}
          />
        </div>
      )}
    </Card>
  )
}
