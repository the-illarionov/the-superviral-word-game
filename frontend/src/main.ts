import './assets/css/main.css'
import { ViteSSG } from 'vite-ssg'
import { createI18n } from 'vue-i18n'
import App from './App.vue'

import messages from './messages.json'

import { DEFAULT_LOCALE } from './composables/useConstants'
import PageLobby from './pages/PageLobby/PageLobby.vue'
import PageGame from './pages/PageGame/PageGame.vue'
import PageScores from './pages/PageScores/PageScores.vue'
import PageIndex from '@/pages/PageIndex/PageIndex.vue'

export const createApp = ViteSSG(
  // the root component
  App,
  // vue-router options
  {
    routes: [
      {
        path: '/',
        name: 'PageIndex',
        component: PageIndex,
      },
      {
        path: '/lobby',
        name: 'PageLobby',
        component: PageLobby,
      },
      {
        path: '/game',
        name: 'PageGame',
        component: PageGame,
      },
      {
        path: '/scores',
        name: 'PageScores',
        component: PageScores,
      },
    ],
    base: import.meta.env.BASE_URL,
  },
  ({ app }) => {
    const i18n = createI18n({
      messages,
      legacy: false,
      locale: DEFAULT_LOCALE,
      fallbackLocale: DEFAULT_LOCALE,
      warnHtmlMessage: false,
    })
    app.use(i18n)

    if (!import.meta.env.SSR) {
      window.___e2e = {
        iceCandidates: [],
        dictionaries: {
          en: [],
        },
        messages: {},
      }
    }
  },
)
