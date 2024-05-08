const AVAILABLE_LOCALES: Locale[] = import.meta.env.VITE_MODE === 'ykt' ? ['ru', 'ykt'] : ['en']

const DEFAULT_LOCALE: Locale = import.meta.env.VITE_MODE === 'ykt' ? 'ykt' : 'en'

const ASPECT_RATIO = 1.96

const DEBUG_INSPECTOR = import.meta.env.VITE_DEBUG_INSPECTOR === '1'

const DEBUG_GAME = import.meta.env.VITE_DEBUG_GAME === '1'

export {
  AVAILABLE_LOCALES,
  DEFAULT_LOCALE,
  ASPECT_RATIO,
  DEBUG_INSPECTOR,
  DEBUG_GAME,
}
