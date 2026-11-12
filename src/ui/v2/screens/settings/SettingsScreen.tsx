import { Monitor, Moon, Sun } from 'lucide-react'
import { switchUiVersion } from '../../../../state/useSettings.ts'
import { Card, ScreenBody, ScreenHeader } from '../../components/Card.tsx'
import { Segmented } from '../../components/Segmented.tsx'
import { Switch } from '../../components/Switch.tsx'
import { useAppSettings } from '../../state/appContext.ts'

export function SettingsScreen() {
  const { settings, update } = useAppSettings()

  return (
    <ScreenBody className="settings">
      <ScreenHeader
        title="Settings"
        subtitle="Everything is saved in this browser only."
      />
      <Card title="Appearance" subtitle="How the app looks and moves">
        <div className="field-row">
          <div>
            <p className="field-row__label">Theme</p>
            <p className="field-row__hint">
              System follows your device setting.
            </p>
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
          hint="Calmer transitions; also follows your system setting."
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
    </ScreenBody>
  )
}
