import { CheckCheck, Image as ImageIcon, Moon, Sun } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, type ReactNode } from 'react'
import { routeHref, useRoute, type Screen } from '../lib/router.ts'
import { useAppSettings } from '../state/appContext.ts'
import { useScreensaver } from '../state/screensaver.ts'
import { FocusPill } from './FocusPill.tsx'
import { navItems } from './nav.ts'
import { StorageBanner } from './StorageBanner.tsx'

interface ShellProps {
  screens: Record<Screen, () => ReactNode>
}

/** Sidebar on wide screens, tab bar on phones, animated screen changes. */
export function Shell({ screens }: ShellProps) {
  const route = useRoute()
  const { settings, update, resolvedTheme } = useAppSettings()
  const screensaver = useScreensaver()
  const items = navItems(settings)
  // A screen switched off in Settings (e.g. Body) falls back to Home.
  const screen = items.some((i) => i.screen === route.screen)
    ? route.screen
    : 'home'

  // On navigation (not the first load): back to the top, and move focus to the
  // new screen's heading once it has animated in, for keyboard and screen-reader users.
  const firstScreen = useRef(true)
  useEffect(() => {
    if (firstScreen.current) {
      firstScreen.current = false
      return
    }
    window.scrollTo({ top: 0 })
    const timer = setTimeout(() => {
      document
        .querySelector<HTMLElement>('#main h1')
        ?.focus({ preventScroll: true })
    }, 320)
    return () => clearTimeout(timer)
  }, [screen])

  const toggleTheme = () =>
    update({ theme: resolvedTheme === 'dark' ? 'light' : 'dark' })

  return (
    <div className="shell">
      <a
        className="skip-link"
        href="#main"
        onClick={(e) => {
          e.preventDefault()
          document.querySelector<HTMLElement>('#main h1')?.focus()
        }}
      >
        Skip to content
      </a>
      <StorageBanner />
      <aside className="sidebar" aria-label="Main">
        <a className="brand" href={routeHref('home')}>
          <span className="brand__mark">
            <CheckCheck size={18} strokeWidth={2.5} aria-hidden="true" />
          </span>
          <span className="brand__name">To-do</span>
        </a>
        <nav className="sidebar__nav">
          {items.map(({ screen: s, label, icon: Icon }) => (
            <a
              key={s}
              href={routeHref(s)}
              className={`nav-link ${s === 'settings' ? 'nav-link--end' : ''}`}
              aria-current={s === screen ? 'page' : undefined}
              title={label}
            >
              {s === screen && (
                <motion.span
                  layoutId="nav-active"
                  className="nav-link__active"
                  transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                />
              )}
              <Icon size={19} strokeWidth={1.9} aria-hidden="true" />
              <span className="nav-link__label">{label}</span>
            </a>
          ))}
        </nav>
        <button
          type="button"
          className="theme-toggle"
          onClick={screensaver.start}
          aria-label="Show the screensaver"
          title="Show the screensaver"
        >
          <span className="theme-toggle__icon">
            <ImageIcon size={17} aria-hidden="true" />
          </span>
          <span className="nav-link__label">Screensaver</span>
        </button>
        <button
          type="button"
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} theme`}
          title="Toggle theme"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={resolvedTheme}
              initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: 90, opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.2 }}
              className="theme-toggle__icon"
            >
              {resolvedTheme === 'dark' ? (
                <Moon size={17} />
              ) : (
                <Sun size={17} />
              )}
            </motion.span>
          </AnimatePresence>
          <span className="nav-link__label">
            {resolvedTheme === 'dark' ? 'Dark' : 'Light'} theme
          </span>
        </button>
      </aside>

      <main className="main" id="main">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={screen}
            className="main__inner"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            {screens[screen]()}
          </motion.div>
        </AnimatePresence>
      </main>

      <FocusPill hidden={screen === 'focus'} />

      <nav className="tabbar" aria-label="Main">
        {items.map(({ screen: s, label, icon: Icon }) => (
          <a
            key={s}
            href={routeHref(s)}
            className="tab"
            aria-current={s === screen ? 'page' : undefined}
          >
            {s === screen && (
              <motion.span
                layoutId="tab-active"
                className="tab__active"
                transition={{ type: 'spring', stiffness: 500, damping: 40 }}
              />
            )}
            <Icon size={21} strokeWidth={1.9} aria-hidden="true" />
            <span>{label}</span>
          </a>
        ))}
      </nav>
    </div>
  )
}
