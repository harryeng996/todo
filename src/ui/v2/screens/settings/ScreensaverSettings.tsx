import { Check, Clock3, Maximize2 } from 'lucide-react'
import { lazy, Suspense } from 'react'
import type { SaverLayout, SaverTheme } from '../../../../state/useSettings.ts'
import { Button } from '../../components/Button.tsx'
import { Card } from '../../components/Card.tsx'
import { Segmented } from '../../components/Segmented.tsx'
import { Switch } from '../../components/Switch.tsx'
import { PALETTES, PALETTE_IDS, swatch } from '../../screensaver/themes.ts'
import { useAppSettings } from '../../state/appContext.ts'
import { useScreensaver } from '../../state/screensaver.ts'

// The preview pulls in the screensaver's own chunk (scene, font, styles).
const SaverPreview = lazy(() => import('../../screensaver/SaverPreview.tsx'))

const IDLE = [0, 1, 2, 5, 10, 15, 30]

const AUTO_SWATCH =
  'conic-gradient(from 200deg, #ffd36e, #00c8ff, #8a4dff, #2f3442, #ffd36e)'

/** Ambient clock settings with a live preview. */
export function ScreensaverSettings({ id }: { id: string }) {
  const { settings, update } = useAppSettings()
  const { start } = useScreensaver()
  const themes: { id: SaverTheme; label: string; background: string }[] = [
    { id: 'auto', label: 'Auto', background: AUTO_SWATCH },
    ...PALETTE_IDS.map((p) => ({
      id: p,
      label: PALETTES[p].label,
      background: swatch(p),
    })),
  ]

  return (
    <Card
      id={id}
      icon={<Clock3 size={16} />}
      title="Screensaver"
      subtitle="An ambient clock with today's numbers, after a while without input"
      action={
        <Button
          variant="soft"
          size="sm"
          icon={<Maximize2 size={14} />}
          onClick={start}
        >
          Show now
        </Button>
      }
    >
      <Suspense
        fallback={<div className="saver-preview saver-preview--loading" />}
      >
        <SaverPreview
          theme={settings.screensaverTheme}
          layout={settings.screensaverLayout}
          widgets={settings.screensaverWidgets}
          seconds={settings.screensaverSeconds}
        />
      </Suspense>

      <div className="field-row">
        <div>
          <p className="field-row__label">Colours</p>
          <p className="field-row__hint">
            Auto: sunrise in the morning, ocean by day, dusk in the evening,
            graphite at night.
          </p>
        </div>
        <div className="swatches" role="radiogroup" aria-label="Colours">
          {themes.map((t) => {
            const on = settings.screensaverTheme === t.id
            return (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={on}
                aria-label={t.label}
                title={t.label}
                className={`swatch ${on ? 'is-on' : ''}`}
                style={{ background: t.background }}
                onClick={() => update({ screensaverTheme: t.id })}
              >
                {on && <Check size={14} strokeWidth={3} aria-hidden="true" />}
              </button>
            )
          })}
        </div>
      </div>

      <div className="field-row">
        <div>
          <p className="field-row__label">Layout</p>
          <p className="field-row__hint">
            StandBy puts the clock beside the widgets, like a phone on a stand.
          </p>
        </div>
        <Segmented<SaverLayout>
          label="Layout"
          value={settings.screensaverLayout}
          onChange={(screensaverLayout) => update({ screensaverLayout })}
          options={[
            { value: 'centered', label: 'Centered' },
            { value: 'standby', label: 'StandBy' },
            { value: 'minimal', label: 'Minimal' },
          ]}
        />
      </div>

      <div className="field-row">
        <div>
          <p className="field-row__label">Start after</p>
          <p className="field-row__hint">
            Without mouse or keyboard input. Never while a video plays.
          </p>
        </div>
        <select
          className="select"
          aria-label="Start the screensaver after"
          value={settings.screensaverIdleMin}
          onChange={(e) =>
            update({ screensaverIdleMin: Number(e.target.value) })
          }
        >
          {IDLE.map((m) => (
            <option key={m} value={m}>
              {m === 0
                ? 'Never (only by hand)'
                : `${m} ${m === 1 ? 'minute' : 'minutes'}`}
            </option>
          ))}
        </select>
      </div>

      <Switch
        id="setting-saver-widgets"
        label="Widgets"
        hint="Tasks, focus, streak and weight or a target, with small charts."
        checked={settings.screensaverWidgets}
        onChange={(screensaverWidgets) => update({ screensaverWidgets })}
      />
      <Switch
        id="setting-saver-seconds"
        label="Show seconds"
        checked={settings.screensaverSeconds}
        onChange={(screensaverSeconds) => update({ screensaverSeconds })}
      />
      <Switch
        id="setting-saver-wake"
        label="Keep the screen awake"
        hint={
          'wakeLock' in navigator
            ? 'Stops the display from sleeping while the screensaver shows.'
            : 'Not supported in this browser.'
        }
        checked={settings.screensaverWakeLock}
        disabled={!('wakeLock' in navigator)}
        onChange={(screensaverWakeLock) => update({ screensaverWakeLock })}
      />
    </Card>
  )
}
