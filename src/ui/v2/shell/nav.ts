import {
  CircleCheckBig,
  House,
  Scale,
  Settings,
  Timer,
  type LucideIcon,
} from 'lucide-react'
import type { Settings as AppSettings } from '../../../state/useSettings.ts'
import type { Screen } from '../lib/router.ts'

export interface NavItem {
  screen: Screen
  label: string
  icon: LucideIcon
}

/** Screens in the sidebar / tab bar; optional features drop out when switched off. */
export function navItems(settings: AppSettings): NavItem[] {
  return [
    { screen: 'home', label: 'Home', icon: House },
    { screen: 'tasks', label: 'Tasks', icon: CircleCheckBig },
    ...(settings.pomodoro || settings.youtube
      ? [{ screen: 'focus' as const, label: 'Focus', icon: Timer }]
      : []),
    ...(settings.weightTracking
      ? [{ screen: 'body' as const, label: 'Body', icon: Scale }]
      : []),
    { screen: 'settings', label: 'Settings', icon: Settings },
  ]
}
