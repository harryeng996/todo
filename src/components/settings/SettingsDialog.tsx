import { X } from 'lucide-react'
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from 'react'
import type { Settings } from '../../state/useSettings.ts'
import { SketchBox } from '../sketch/SketchBox.tsx'
import { SketchButton } from '../sketch/SketchButton.tsx'
import { PomodoroSettings } from './PomodoroSettings.tsx'
import { QuoteSettings } from './QuoteSettings.tsx'
import { SettingsToggle } from './SettingsToggle.tsx'
import { VideoSettings } from './VideoSettings.tsx'

export type SettingsSection =
  'general' | 'weight' | 'quotes' | 'videos' | 'pomodoro'

const TABS: { id: SettingsSection; label: string }[] = [
  { id: 'general', label: 'General' },
  { id: 'weight', label: 'Weight' },
  { id: 'quotes', label: 'Quotes' },
  { id: 'videos', label: 'Videos' },
  { id: 'pomodoro', label: 'Pomodoro' },
]

interface SettingsDialogProps {
  /** The tab to open on, or false when closed. */
  open: SettingsSection | false
  onClose: () => void
  settings: Settings
  onChange: (patch: Partial<Settings>) => void
  /** The music player can be switched off in code (see features.ts). */
  showMusic?: boolean
}

/** Settings, one tab per area: panels, weight, quotes, videos, Pomodoro. */
export function SettingsDialog({
  open,
  onClose,
  settings,
  onChange,
  showMusic = true,
}: SettingsDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const tabRefs = useRef<
    Partial<Record<SettingsSection, HTMLButtonElement | null>>
  >({})
  const [tab, setTab] = useState<SettingsSection>(open || 'general')

  // Opening on a given tab (e.g. from the quote card) selects it.
  const [openedWith, setOpenedWith] = useState(open)
  if (open !== openedWith) {
    setOpenedWith(open)
    if (open) setTab(open)
  }

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    else if (!open && dialog.open) dialog.close()
  }, [open])

  // A click on the backdrop lands on the <dialog> itself, not its content.
  function handleClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === dialogRef.current) onClose()
  }

  // Tabs pattern: arrows move between tabs, Home/End jump to the ends.
  function handleTabKeys(event: KeyboardEvent<HTMLDivElement>) {
    const index = TABS.findIndex((t) => t.id === tab)
    const target =
      event.key === 'ArrowRight'
        ? (index + 1) % TABS.length
        : event.key === 'ArrowLeft'
          ? (index - 1 + TABS.length) % TABS.length
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? TABS.length - 1
              : -1
    if (target === -1) return
    event.preventDefault()
    setTab(TABS[target].id)
    tabRefs.current[TABS[target].id]?.focus()
  }

  return (
    <dialog
      ref={dialogRef}
      className="settings"
      aria-labelledby="settings-heading"
      onClose={onClose}
      onClick={handleClick}
    >
      <SketchBox seed={61} className="settings__box">
        <header className="settings__header">
          <h2 id="settings-heading">Settings</h2>
          <SketchButton
            variant="ghost"
            onClick={onClose}
            aria-label="Close settings"
          >
            <X size={20} strokeWidth={1.75} aria-hidden="true" />
          </SketchButton>
        </header>

        <div
          className="settings__tabs"
          role="tablist"
          aria-label="Settings sections"
          onKeyDown={handleTabKeys}
        >
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              ref={(el) => {
                tabRefs.current[id] = el
              }}
              type="button"
              role="tab"
              id={`settings-tab-${id}`}
              className="settings__tab"
              aria-selected={tab === id}
              aria-controls="settings-panel"
              tabIndex={tab === id ? 0 : -1}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>

        {/* The panel scrolls; the outline, header and tabs stay put. */}
        <div
          id="settings-panel"
          role="tabpanel"
          aria-labelledby={`settings-tab-${tab}`}
          className="settings__body sketch-scroll"
        >
          {tab === 'general' && (
            <>
              <fieldset className="settings__group">
                <legend>Panels</legend>
                {showMusic && (
                  <SettingsToggle
                    id="setting-music"
                    label="Music player"
                    checked={settings.music}
                    onChange={(music) => onChange({ music })}
                  />
                )}
                <SettingsToggle
                  id="setting-youtube"
                  label="YouTube videos"
                  checked={settings.youtube}
                  onChange={(youtube) => onChange({ youtube })}
                />
                <SettingsToggle
                  id="setting-pomodoro"
                  label="Pomodoro timer"
                  checked={settings.pomodoro}
                  onChange={(pomodoro) => onChange({ pomodoro })}
                />
              </fieldset>
              <p className="settings__note">
                Turning a panel off only hides it. Your data is kept.
              </p>
            </>
          )}

          {tab === 'weight' && (
            <fieldset className="settings__group">
              <legend>
                Plus feature <span className="settings__plus">plus</span>
              </legend>
              <SettingsToggle
                id="setting-weight"
                label="Weight tracking"
                hint="Log your weight and one photo per day. Stored only in this browser."
                checked={settings.weightTracking}
                onChange={(weightTracking) => onChange({ weightTracking })}
              />
              {settings.weightTracking && (
                <div
                  className="settings__unit"
                  role="radiogroup"
                  aria-label="Weight unit"
                >
                  {(['kg', 'lb'] as const).map((unit) => (
                    <label key={unit} className="settings__radio">
                      <input
                        type="radio"
                        name="weight-unit"
                        value={unit}
                        checked={settings.weightUnit === unit}
                        onChange={() => onChange({ weightUnit: unit })}
                      />
                      {unit}
                    </label>
                  ))}
                </div>
              )}
            </fieldset>
          )}

          {tab === 'quotes' && <QuoteSettings />}
          {tab === 'videos' && <VideoSettings />}
          {tab === 'pomodoro' && <PomodoroSettings />}
        </div>
      </SketchBox>
    </dialog>
  )
}
