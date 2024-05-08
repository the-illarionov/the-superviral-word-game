/* eslint ts/no-use-before-define: 0 */
import { type DoneActorEvent, assign, createActor, enqueueActions, fromPromise, getInitialSnapshot, setup } from 'xstate'
import { shallowRef } from 'vue'
import { createBrowserInspector } from '@statelyai/inspect'
import type { MachineDictionaryEvent } from './types'
import { AVAILABLE_LOCALES, DEBUG_INSPECTOR } from '@/composables/useConstants'
import { useAssert } from '@/composables/useAssert'
import { generateUrlDictionary } from '@/composables/useUrlGenerator'

class Dictionary {
  words: string[] = []
  wordsLength = 0

  wordsForMainWordGeneration: string[] = []
  wordsForMainWordGenerationLength = 0
}

const MachineDictionary = setup({
  types: {} as {
    context: {
      locale: Locale
      cache: Cache
      dictionaries: {
        ru: Dictionary
        en: Dictionary
        ykt: Dictionary
      }
    }
    events: MachineDictionaryEvent
  },
  actions: {
    assignLocale: assign({
      locale: ({ event }) => {
        useAssert(event.type === 'Awake')
        return event.locale
      },
    }),
    assignCache: assign({
      cache: ({ event }) => (event as unknown as DoneActorEvent<Cache>).output,
    }),

    setWordsForLocale: enqueueActions(async ({ context, event, enqueue }) => {
      useAssert(event.type === 'Set words for locale')

      let part = 10
      if (event.locale === 'en') {
        part = 20

        window.___e2e.dictionaries = {
          en: event.words,
        }
      }

      const wordsLength = event.words.length

      const startingIndex = wordsLength - ~~(wordsLength / part)
      const wordsForMainWordGeneration = event.words.slice(startingIndex)

      enqueue.assign({
        dictionaries: {
          ...context.dictionaries,
          [event.locale]: {
            words: event.words,
            wordsLength: event.words.length,
            wordsForMainWordGeneration,
            wordsForMainWordGenerationLength: wordsForMainWordGeneration.length,
          },
        },
      })

      console.log('set dictionary for locale', event.locale)
    }),

    checkIfAllWordsAreSet: enqueueActions(async ({ context, enqueue }) => {
      let missingLocale: Locale | undefined

      for (const locale in context.dictionaries) {
        if (context.dictionaries[locale as Locale].wordsLength === 0 && AVAILABLE_LOCALES.includes(locale as Locale)) {
          missingLocale = locale as Locale
          break
        }
      }

      if (missingLocale) {
        enqueue.raise({
          type: 'Found missing words for locale',
          locale: missingLocale,
        })
      }
      else {
        enqueue.raise({
          type: 'All words are set',
        })
      }
    }),

    logWordsAreSet() {
      console.log('all words are set')
    },
  },
  actors: {
    openCache: fromPromise<Cache>(async () => {
      const cache = await caches.open('dictionaries')
      return cache
    }),
    checkCacheForLocale: fromPromise<void, { locale: Locale, cache: Cache }>(async ({ input }) => {
      const locale = input.locale
      const cachedDictionaryResponse = await input.cache.match(generateUrlDictionary(locale))

      if (cachedDictionaryResponse) {
        const words = await cachedDictionaryResponse.json()

        send({
          type: 'Set words for locale',
          locale,
          words,
        })
      }
      else {
        send({
          type: 'Download dictionary for locale',
          locale,
        })
      }
    }),

    downloadDictionaryForLocale: fromPromise<void, { cache: Cache, locale: Locale }>(async ({ input }) => {
      const response = await fetch(generateUrlDictionary(input.locale))

      await input.cache.put(generateUrlDictionary(input.locale), response.clone())

      const words = await response.json()

      console.log('downloaded dictionary', input.locale)

      send({
        type: 'Set words for locale',
        locale: input.locale,
        words,
      })
    }),
  },
}).createMachine({
/** @xstate-layout N4IgpgJg5mDOIC5QFkCGBjAFgSwHZgBFt0AXbAe11QCcBPAOgGFMx0BrPKAAnQxa4Bm5alwA25XqLABiAuQDuucaghcIxMpRq1BwsRNRSA2gAYAuolAAHcrGybclkAA9EANgBMATnoBmAKwAHCYBAIzBXv4mAOwANCC0iL6hftFu0aFuvoGB0R4ALCb+bgC+JfFoWHiEGhRUdEws7Jw8fGC6IuKSMgDKYCRc8sIQsB363aYWSCA2dg5OrghZ+fR5XoFeJh7BBaHxiQgeGavJ0YG+GdEmntH5ZRV81USkddqNrBy43NgCXIaig2Goxo7Vg-WkADFyABXXCqAC22Fgdi+gOoIzGXUMYEmTlm9jqC0QHl8vnoXi8HkyniKgTcoXy-n2iEKbnogSpgXybjcxUi2XuIEqOHwzwcb2YHxaPz+ogBQ3RwOooPBAEE5WiMSCuGCSLjpvj5tNFqFvGTfJ5-IUzr4TCF8szDl4Vozzv5QtkrvkBeUhY9RbUtA05IplOpUeoXkGdEJOgYpNI+gMFRjY+NsfrrLYCZQiQhQiZ8itbkF8nk3IF-P5nY7QlF6FSLkdfB5C75BcKnoH6gwAPJWMC4Fq8LAyCCUMD0PAAN3IbEn5AHuEYbUzM2zRtAiwAtJlyYWgraSTcjkyEohQj5eSYGRTkqFMrl-B3-TUoz36D0pGArNJVfJUHnNdDUJY1EG3fJInoNxGStbkqTOIpazJaJsitTJnTcZ18kCMpfVwcgIDgJxOwDd9tDxDdQK3cCKxSSsi22D0cJvLxHW3W56H8XwcMifJTS2OtohfKoyPFBpJWaVER34NMsSkSi5molwL2iaIG3yKlGQKXjwgdc9838PwNkrbiPBuNTvREkU33EhhJM+b5fn+TUlRVEhFJzRwwPzG8PFSUzTW8BlvEdI5AnoMsGVQrxTUpdZhN9UjbNeYMFCUcgVBaSM7MxeMwE8zcVIQZ11KyGCCluc5mLClYcnWKtci5MJnyS18xVShh1XlIE-mVHV+kK5STUg9Triwz0rhCVCwq8MlW3ObYvRMCI7ja0SUujeh+0HYc2iG3MfO3FsjMCOsAi8L1zKQgzTXJXkC246JuMgxlSnWmyOq2r8wB-A7vJohBtyyMkGM0s6eOCS8wrZZiq2PcJIZiPCSiAA */
  context: {
  // @ts-expect-error undefined
    cache: undefined,
    // @ts-expect-error undefined
    locale: undefined,
    dictionaries: {
      ru: new Dictionary(),
      en: new Dictionary(),
      ykt: new Dictionary(),
    },
  },

  id: 'MachineDictionary',

  states: {
    'Checking cache for locale': {
      invoke: {
        src: 'checkCacheForLocale',
        id: 'checkCacheForLocale',

        input: ({ context, event }) => ({
          locale: event.type === 'Found missing words for locale' ? event.locale : context.locale,
          cache: context.cache,
        }),
      },

      on: {
        'Download dictionary for locale': {
          target: 'Downloading dictionary for locale',
          reenter: true,
        },

        'Set words for locale': {
          target: 'Checking if all words are set',
          actions: 'setWordsForLocale',
          reenter: true,
        },
      },
    },

    'Checking if all words are set': {
      on: {
        'Found missing words for locale': 'Checking cache for locale',
        'All words are set': 'All words are set',
      },

      entry: 'checkIfAllWordsAreSet',
    },

    'Downloading dictionary for locale': {
      on: {
        'Set words for locale': {
          target: 'Checking if all words are set',
          actions: 'setWordsForLocale',
        },
      },

      invoke: {
        src: 'downloadDictionaryForLocale',
        id: 'downloadDictionaryForLocale',
        input: ({ context, event }) => {
          useAssert(event.type === 'Download dictionary for locale')
          return {
            cache: context.cache,
            locale: event.locale,
          }
        },
      },
    },

    'All words are set': {
      type: 'final',
      entry: 'logWordsAreSet',
    },

    'Opening cache': {
      invoke: {
        src: 'openCache',
        id: 'openCache',
        onDone: {
          target: 'Checking cache for locale',
          actions: 'assignCache',
        },
      },
    },

    'Sleep': {
      on: {
        Awake: {
          target: 'Opening cache',
          actions: 'assignLocale',
        },
      },
    },
  },

  initial: 'Sleep',
})

const snapshot = shallowRef(getInitialSnapshot(MachineDictionary))

const actorRef = createActor(MachineDictionary, DEBUG_INSPECTOR
  ? { inspect: createBrowserInspector().inspect }
  : {}).start()

actorRef.subscribe({
  next(newSnapshot) {
    snapshot.value = newSnapshot
  },
  error(err) {
    console.error(err)
  },
})

actorRef.start()

const send = actorRef.send

const machineDictionary = {
  snapshot,
  send,
}

export {
  machineDictionary,
}
