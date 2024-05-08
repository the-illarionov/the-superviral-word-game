/* eslint ts/no-use-before-define: 0 */

import { assign, createActor, enqueueActions, getInitialSnapshot, setup } from 'xstate'
import type { Composer } from 'vue-i18n'
import { shallowRef } from 'vue'
import type { Router } from 'vue-router'
import { createBrowserInspector } from '@statelyai/inspect'
import { machineGraphics } from '../MachineGraphics/MachineGraphics'
import { machineAudio } from '../MachineAudio/MachineAudio'
import { machineDictionary } from '../MachineDictionary/MachineDictionary'
import { machineLobby } from '../MachineLobby/MachineLobby'
import { machineGame } from '../MachineGame/MachineGame'
import { machineRTC } from '../MachineRTC/MachineRTC'
import type { EventInitialize, MachineAppEvent } from './types'
import { useDecodeLocale } from '@/composables/useDecodeLocale'
import { AVAILABLE_LOCALES, DEBUG_INSPECTOR, DEFAULT_LOCALE } from '@/composables/useConstants'
import { useAssert } from '@/composables/useAssert'

const MachineApp = setup({
  types: {} as {
    tags: 'initialized' | 'show-critical-error' | 'game-started'
    context: {
      locale: Locale
      i18n: Composer
      router: Router
      error: ErrorTypes
      isMobile: boolean
    }
    events: MachineAppEvent
  },
  actions: {
    addVisibilityChangeListener() {
      if (!import.meta.env.SSR) {
        document.onvisibilitychange = () => {
          if (document.visibilityState === 'visible') {
            send({
              type: 'Document becomes visible',
            })
          }
        }
      }
    },

    assigni18n: assign({
      i18n: ({ event }) => (event as EventInitialize).i18n,
    }),

    assignRouter: assign({
      router: ({ event }) => (event as EventInitialize).router,
    }),

    assignIsMobile: assign({
      isMobile: isMobile(),
    }),

    assignError: assign({
      error: ({ event }) => {
        useAssert(event.type === 'Critical error occured')

        return event.errorType
      },
    }),
    unassignError: assign({
      error: undefined,
    }),

    navigateToPageIndex({ context }) {
      context.router.push({
        name: 'PageIndex',
      })
    },

    assignLocale: assign({
      locale: ({ event }) => {
        useAssert(event.type === 'User changed locale')

        return event.locale
      },
    }),

    manageLocale: enqueueActions(({ enqueue, context }) => {
      const storedLocale = localStorage.getItem('locale') as Locale
      const definedLocale = useDecodeLocale()

      let locale: Locale

      if (definedLocale)
        locale = definedLocale as Locale
      else
        locale = storedLocale ?? DEFAULT_LOCALE

      if (!AVAILABLE_LOCALES.includes(locale)) {
        enqueue.raise({
          type: 'Critical error occured',
          errorType: 'INVALID_LOCALE',
        })

        return
      }

      enqueue.assign({
        locale: () => locale,
      })
      localStorage.setItem('locale', locale)
      context.i18n.locale.value = locale
      window.___e2e.locale = locale
    }),

    checkSupport: enqueueActions(({ enqueue }) => {
      if (typeof RTCPeerConnection === 'undefined'
        || typeof WebSocket === 'undefined'
        || typeof structuredClone === 'undefined'
      ) {
        enqueue.raise({
          type: 'Critical error occured',
          errorType: 'UNSUPPORTED',
        })
      }
    }),

    awakeMachineGraphics() {
      document.addEventListener('readystatechange', () => {
        if (document.readyState === 'complete') {
          machineGraphics.send({
            type: 'Awake',
            canvas: document.querySelector('#graphics') as HTMLCanvasElement,
          })
        }
      })
      console.log('awakeMachineGraphics')
    },

    awakeMachineAudio() {
      document.addEventListener('readystatechange', () => {
        if (document.readyState === 'complete') {
          machineAudio.send({
            type: 'Awake',
            waiting: document.querySelector('#audio-waiting') as HTMLAudioElement,
          })
        }
      })

      console.log('awakeMachineAudio')
    },

    awakeMachineDictionary({ context }) {
      machineDictionary.send({
        type: 'Awake',
        locale: context.locale,
      })
      console.log('awakeMachineDictionary')
    },

    awakeMachineLobby({ context }) {
      const m = new URL(document.location.href).searchParams.get('m')

      let myMode: PlayerModes

      if (m === 'h')
        myMode = 'host'
      else if (m === 'g')
        myMode = 'guest'
      else myMode = 'not-set'

      machineLobby.send({
        type: 'Awake',
        myMode,
        locale: context.locale,
      })

      console.log('awakeMachineLobby')
    },
    sleepMachineLobby({ event }) {
      if (
        event.type === 'Document becomes visible'
        && isMobile()
        && machineRTC.snapshot.value.hasTag('connected')) {
        send({
          type: 'Critical error occured',
          errorType: 'YOU_DISCONNECTED',
        })
      }

      machineLobby.send({
        type: 'Sleep',
      })
      console.log('sleepMachineLobby')
    },

    navigateToPageGame({ context }) {
      context.router.push({
        name: 'PageGame',
      })
    },

    awakeMachineGame({ context, event }) {
      useAssert(event.type === 'Game started')
      machineGame.send({
        type: 'Awake',
        locale: context.locale,
        myMode: event.myMode,
        myName: event.myName,
        enemyName: event.enemyName,
        enemyId: event.enemyId,
      })

      console.log('awakeMachineGame')
    },

    sleepMachineGame() {
      machineGame.send({
        type: 'Sleep',
      })

      console.log('sleepMachineGame')
    },

    callErrorYouDisconnected() {
      send({
        type: 'Critical error occured',
        errorType: 'YOU_DISCONNECTED',
      })
    },
  },
  guards: {
    isMobile,
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QFkCGBjAFgSwHZgEEAHIgOgIHdUBrMAYgGUAbMMIgbQAYBdRUIgPaxsAF2wDcfEAA9EAWgDsAZlIAWAGwBGJUoAcq3UoWqArAE4TAGhABPRKs2bSnC0vULzu-UoBMCgL7+1mhYeIQk5FS0pGh4AAQAtmC4AK50AKqwYABOcRTJInEiAnFMAgBG5TZcvEgggsJiElKyCOqcnKTtnCY+Pr0+ParWdgiqPiomvqozCupmSgY+gcEYOPjEZJQ0YDGo8UmpdADC2aLY6KhMcTnZArkC6Ogp2ZA1Ug3nzXWtRgpd2mUbj6Sk4Ck0I0QJnUPjUCgUZmU5kcCPUKxAIXW4S2UV2sVwiWSaUyOTiWFQuBgEFKjyuYHedU+TUkP0QPlUKk06nUSimeh8jhMnHUkIQSk0qlImjMug6fTmHQ5SnRmLCm0iO1IDEwAgoeCgZLOYku11u9zoAFFsndclRYGSylkIAz+EIvizQK1ND51FKTNKYW4ZhyDKLer7egYLDMzD1OJoVWs1RFttEAApMVA2HL2vAiHIYEQZLK2gpFEqHFIu+pu5ktRDdNRB8zx8GK0U6X1mdnQ1Tw7pKxOhDYp3GkDNZnNxPMF9BF07nE03a33OKPZ6vZ08D618QemQNzgqByqWM8jxueGi7mTDmaHpTUzmZZBDFJkc4zUT7PZXO4fPZIWpAADIVFUdAACKPCkhyFOUYDoAIST2gAbtgwjlCw1ZMnu9YIGY7ikCY-qImCgzSsKYY9KQMo9N64K8n0CavqqH4aummY-n+AFAaBlQ2HQADiqBJHEsAiKg2T5lutSuo0uGsggji6P8KnwkYxHaCYyhhmYZikOyXgqZw7IcgoL6rMO2Lsbs35TjOgFzqQwlJJB0GwXE8GIchcRoRhWHboyu7fJ6iBclMNECjomjwvCfTXgKNEeByhjsgiuhoix77WcwrBEHQqb0oFcnunhcj3pKCi6FyMZpdyEqij6pDGH23LCrKehuEOWLqoV46cfZ-6ziIIFgQJJK5OSlKQHEuAiUVsk1vJIUHkpR6VZw1UeFovjeKKxgmKQ4qqMKfZ6e03KBK+uACBAcBSKx2I7st+6tHIPi6Id-ITIsfbSipIq2PI97-B4Azdh9R4eGY3XJp+tDPaVilVX6AYTOowaLLo+2HfM6VHqCpgaKosNsX1+KEqkiN1op4z6VyPJ8roAqaEKgOjOMky+EKgyxo4BEk1lVm9WO2q6vqhqLlcy42tTCmhWKCIGazOgmH2rbzNeQpqDCMxaCZfRmMxlk9aOX4Db+05DY5IhyytrQZf8oLEbyCzfVYQNjJouhqLKasmZt7QfZlJtwzZ-WTpbDm8WNduvYgRtfQ+rs6Mz-Rhp9cJqydPjRuo2mk9ZfV2VH1tAS5YBx3h2gEc1zMaFy5mmBCnsmJnfbZ7r0KJ4XIvm5H3HDaQVo2ggcQ2AIKRxBA6GIbg+BzpAVeKeRkqLIMcXmBjBG6T7HczD0sa596vcRLlbDLwr71GEdac6LM-1zDjkUzC7hi9GCARXUAA */
  id: 'MachineApp',

  context: {
    locale: DEFAULT_LOCALE,
    // @ts-expect-error undefined
    i18n: undefined,
    // @ts-expect-error undefined
    router: undefined,
    error: undefined,
    isMobile: false,
  },

  states: {
    Awake: {
      tags: ['initialized'],

      states: {
        'Main menu': {
          on: {
            'User went to lobby': {
              target: 'Players interact',
              reenter: true,
            },

            'Critical error occured': 'Showing critical error',
            'User changed locale': {
              target: 'Main menu',
              actions: 'assignLocale',
            },
          },
        },

        'Showing critical error': {
          tags: 'show-critical-error',
          on: {
            'Error was closed': {
              target: 'Main menu',
              actions: ['unassignError', 'navigateToPageIndex'],
            },
          },

          entry: 'assignError',
        },

        'Players interact': {
          initial: 'Lobby',

          states: {
            'Lobby': {
              entry: 'awakeMachineLobby',

              exit: 'sleepMachineLobby',

              on: {
                'Document becomes visible': {
                  target: 'Lobby',
                  reenter: true,
                  guard: 'isMobile',
                },

                'Game started': {
                  target: 'Game',
                  actions: 'navigateToPageGame',
                },
              },
            },

            'Game': {
              tags: 'game-started',
              entry: 'awakeMachineGame',
              exit: 'sleepMachineGame',

              on: {
                'Document becomes visible': {
                  target: 'Error: you disconnected',
                  guard: 'isMobile',
                },
              },
            },

            'Error: you disconnected': {
              entry: 'callErrorYouDisconnected',
            },
          },

          on: {
            'User went to menu': {
              target: 'Main menu',
              reenter: true,
            },

            'Critical error occured': {
              target: 'Showing critical error',
              reenter: true,
            },
          },
        },
      },

      initial: 'Main menu',

      entry: [
        'manageLocale',
        'checkSupport',
        'awakeMachineGraphics',
        'awakeMachineAudio',
        'awakeMachineDictionary',
      ],

      on: {
        Sleep: 'Sleep',
      },
    },

    Sleep: {
      on: {
        Awake: {
          target: 'Awake',
          actions: ['assigni18n', 'assignRouter', 'assignIsMobile'],
        },
      },
    },
  },

  initial: 'Sleep',
  entry: 'addVisibilityChangeListener',
})

function isMobile() {
  return typeof window !== 'undefined' ? window.matchMedia('(max-width: 1024px)').matches : false
}

const snapshot = shallowRef(getInitialSnapshot(MachineApp))

const actorRef = createActor(MachineApp, DEBUG_INSPECTOR
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

const machineApp = {
  snapshot,
  send,
}

export {
  machineApp,
}
