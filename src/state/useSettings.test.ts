import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadSettings, switchUiVersion } from './useSettings.ts'

const KEY = 'todoapp.settings.v1'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('settings', () => {
  it('defaults to the v2 interface, also for settings saved before it existed', () => {
    expect(loadSettings().uiVersion).toBe('v2')
    localStorage.setItem(KEY, JSON.stringify({ pomodoro: false }))
    expect(loadSettings()).toMatchObject({ uiVersion: 'v2', pomodoro: false })
  })

  it('switching the interface keeps the other settings and reloads', () => {
    const reload = vi.fn()
    vi.stubGlobal('location', { reload })
    localStorage.setItem(KEY, JSON.stringify({ weightTracking: true }))
    switchUiVersion('v1')
    expect(loadSettings()).toMatchObject({
      uiVersion: 'v1',
      weightTracking: true,
    })
    expect(reload).toHaveBeenCalledOnce()
  })
})
