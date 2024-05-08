/* eslint ts/no-use-before-define: 0 */

import { assign, createActor, enqueueActions, getInitialSnapshot, setup } from 'xstate'
import { shallowRef } from 'vue'
import { createBrowserInspector } from '@statelyai/inspect'
import { machineSocket, socketListen, socketSend } from '../MachineSocket/MachineSocket'
import { machineApp } from '../MachineApp/MachineApp'
import { RTClisten, RTCsend, machineRTC } from '../MachineRTC/MachineRTC'
import { machineDictionary } from '../MachineDictionary/MachineDictionary'
import type { MachineLobbyEvent } from './types'
import { useAssert } from '@/composables/useAssert'
import { useReplaceHistory } from '@/composables/useReplaceHistory'
import { generateUrljoinGame } from '@/composables/useUrlGenerator'
import { DEBUG_INSPECTOR, DEFAULT_LOCALE } from '@/composables/useConstants'

const INITIALIZATION_TIMEOUT = 20000

class PlayerConnectionInfo {
  sessionId: string | undefined
  sdp: RTCSessionDescriptionInit | undefined
  iceCandidates: RTCIceCandidate[] = []
  isReady: boolean = false
  initializedDictionary: boolean = false
  name = ''
  id = ''
}

const MachineLobby = setup({
  types: {} as {
    tags: 'loading' | 'waiting-for-host' | 'connection-established'
    context: {
      myMode: PlayerModes
      iceServers: RTCIceServer[]
      locale: Locale

      me: PlayerConnectionInfo
      enemy: PlayerConnectionInfo
    }
    events: MachineLobbyEvent
  },
  actions: {
    restoreContext: assign({
      myMode: 'not-set',
      iceServers: [],
      locale: DEFAULT_LOCALE,

      me: new PlayerConnectionInfo(),
      enemy: new PlayerConnectionInfo(),
    }),

    assignMyMode: assign({
      myMode: ({ event }) => {
        useAssert(event.type === 'Awake')
        return event.myMode
      },
    }),
    assignLocale: assign({
      locale: ({ event }) => {
        useAssert(event.type === 'Awake')
        return event.locale
      },
    }),
    assignMyName: assign({
      me: ({ context }) => ({
        ...context.me,
        name: localStorage.getItem('name') ?? '',
      }),
    }),

    iChangedName: assign({
      me: ({ context, event }) => {
        useAssert(event.type === 'I changed name')

        if (machineRTC.snapshot.value.hasTag('connected')) {
          RTCsend({
            type: 'CHANGE_NAME',
            name: event.name,
          })
        }

        return {
          ...context.me,
          name: event.name,
        }
      },
    }),

    enemyChangedName: assign({
      enemy: ({ context, event }) => {
        useAssert(event.type === 'Enemy changed name')

        return {
          ...context.enemy,
          name: event.name,
        }
      },
    }),

    assignEnemyId: assign({
      enemy: ({ context, event }) => {
        useAssert(event.type === 'Enemy sent id')

        return {
          ...context.enemy,
          id: event.id,
        }
      },
    }),

    awakeMachineSocket({ context }) {
      machineSocket.send({
        type: 'Awake',
        myMode: context.myMode,
      })
      console.log('awakeMachineSocket')
    },
    sleepMachineSocket() {
      machineSocket.send({
        type: 'Sleep',
      })
      console.log('sleepMachineSocket')
    },

    sleepMachineRTC() {
      if (!machineApp.snapshot.value.hasTag('game-started')) {
        machineRTC.send({
          type: 'Sleep',
        })
        console.log('sleepMachineRTC')
      }
    },

    sendHandshake({ context }) {
      let sessionId: string | null
      const url = new URL(document.location.href)
      const params = url.searchParams

      if (context.myMode === 'host')
        sessionId = params.get('h')

      else
        sessionId = params.get('g')

      socketSend({
        type: 'PLAYER_SENT_HANDSHAKE',
        sessionId,
        playerId: localStorage.getItem('playerId'),
        mode: context.myMode,
      })

      socketListen('SERVER_ANSWERED_HANDSHAKE', (message) => {
        useAssert(message.type === 'SERVER_ANSWERED_HANDSHAKE')

        const sessionId = message.sessionId

        window.___e2e.sessionId = sessionId

        if (context.myMode === 'guest') {
          params.set('g', sessionId)
          useReplaceHistory(url.search)
        }

        send({
          type: 'Server answered handshake',
          mySessionId: sessionId,
          iceServers: message.iceServers,
          enemySessionId: message.enemySessionId,
          myId: message.playerId,
        })
      })
    },

    assignMySessionId: assign({
      me: ({ context, event }) => {
        useAssert(event.type === 'Server answered handshake')
        return {
          ...context.me,
          sessionId: event.mySessionId,
        }
      },
    }),
    assignEnemySessionId: assign({
      enemy: ({ context, event }) => {
        useAssert(event.type === 'Server answered handshake' || event.type === 'Guest requested to join')
        const enemySessionId = context.myMode === 'host'
          ? event.enemySessionId
          : new URL(document.location.href).searchParams.get('h')!
        return {
          ...context.enemy,
          sessionId: enemySessionId,
        }
      },
    }),
    assignIceServers: assign({
      iceServers: ({ event }) => {
        useAssert(event.type === 'Server answered handshake')
        return event.iceServers
      },
    }),
    assignMyId: assign({
      me: ({ context, event }) => {
        useAssert(event.type === 'Server answered handshake')
        localStorage.setItem('playerId', event.myId)
        return {
          ...context.me,
          id: event.myId,
        }
      },
    }),

    callErrorInitializationTimeout() {
      machineApp.send({
        type: 'Critical error occured',
        errorType: 'INITIALIZATION_TIMEOUT',
      })
    },
    callErrorWrongMode() {
      machineApp.send({
        type: 'Critical error occured',
        errorType: 'INVALID_MODE',
      })
    },

    // WAITING FOR FULL PREPARENESS
    listenForReadyAndDictionary() {
      RTClisten('READY', () => {
        send({
          type: 'Enemy is ready',
        })
      })

      RTClisten('INITIALIZED_DICTIONARY', () => {
        send({
          type: 'Enemy initialized dictionary',
        })
      })
    },

    listenForInfo() {
      RTClisten('CHANGE_NAME', (message) => {
        useAssert(message.type === 'CHANGE_NAME')
        send({
          type: 'Enemy changed name',
          name: message.name,
        })
      })

      RTClisten('ID', (message) => {
        useAssert(message.type === 'ID')
        send({
          type: 'Enemy sent id',
          id: message.id,
        })
      })
    },

    sendMyInfo({ context }) {
      RTCsend({
        type: 'CHANGE_NAME',
        name: context.me.name,
      })

      RTCsend({
        type: 'ID',
        id: context.me.id,
      })
    },

    checkIfDictionaryInitialized({ context }) {
      const wordsLength = machineDictionary.snapshot.value.context.dictionaries[context.locale].wordsLength

      if (wordsLength > 0) {
        send({
          type: 'I initialized dictionary',
        })
      }
    },

    checkIfPlayersReady({ context }) {
      if (context.me.isReady && context.enemy.isReady)
        send({ type: 'Both players ready' })
      console.log('checkIfPlayersReady')
    },

    assignMeReadyTrue: assign({
      me: ({ context }) => ({
        ...context.me,
        isReady: true,
      }),
    }),

    sendMeReadyToEnemy() {
      RTCsend({
        type: 'READY',
      })
    },

    assignEnemyReadyTrue: assign({
      enemy: ({ context }) => ({
        ...context.enemy,
        isReady: true,
      }),
    }),

    assignMeInitializedDictionaryTrue: assign({
      me: ({ context }) => ({
        ...context.me,
        initializedDictionary: true,
      }),
    }),

    sendMeInitializedDictionaryToEnemy() {
      RTCsend({
        type: 'INITIALIZED_DICTIONARY',
      })
    },

    assignEnemyInitializedDictionaryTrue: assign({
      enemy: ({ context }) => ({
        ...context.enemy,
        initializedDictionary: true,
      }),
    }),

    checkIfPlayersInitializedDictionary({ context }) {
      if (context.me.initializedDictionary && context.enemy.initializedDictionary) {
        machineApp.send({
          type: 'Game started',
          myMode: context.myMode,
          myName: context.me.name,
          enemyName: context.enemy.name,
          enemyId: context.enemy.id,
        })
      }
    },

    // HOST ACTIONS
    hostInitsURL({ context }) {
      useReplaceHistory(
        generateUrljoinGame({
          hostId: context.me.sessionId!,
          locale: context.locale,
          mode: 'host',
          paramsOnly: true,
        }),
      )
    },

    hostListensForGuestRequest() {
      socketListen('SERVER_SENT_GUEST_REQUESTS_TO_JOIN', (message) => {
        useAssert(message.type === 'SERVER_SENT_GUEST_REQUESTS_TO_JOIN')
        send({
          type: 'Guest requested to join',
          enemySessionId: message.guestSessionId,
        })
      })
    },

    hostChecksGuestSessionId: enqueueActions(({ enqueue, context }) => {
      if (context.enemy.sessionId) {
        enqueue.raise({
          type: 'Found guest request',
        })
      }
    }),

    hostAwakesMachineRTC({ context }) {
      machineRTC.send({
        type: 'Awake',
        iceServers: context.iceServers,
        mySessionId: context.me.sessionId!,
        myMode: 'host',
        enemySessionId: context.enemy.sessionId,
        enemySDP: undefined,
        enemyIceCandidates: [],
      })
    },

    // GUEST ACTIONS
    guestChecksIfGameExists({ context }) {
      socketSend({
        type: 'GUEST_CHECKS_IF_GAME_EXISTS',
        hostSessionId: context.enemy.sessionId!,
        guestSessionId: context.me.sessionId!,
      })

      socketListen('SERVER_CONFIRMED_GAME_EXISTS', (message) => {
        useAssert(message.type === 'SERVER_CONFIRMED_GAME_EXISTS')
        send({
          type: 'Server confirmed game exists',
          sdp: message.offer,
          iceCandidates: message.iceCandidates,
        })
      })

      socketListen('SERVER_DID_NOT_CONFIRM_GAME_EXISTS', () => {
        send({
          type: 'Server did not confirm game exists',
        })
      })
    },

    callErrorHostNotFound() {
      machineApp.send({
        type: 'Critical error occured',
        errorType: 'PLAYER_NOT_FOUND_IN_DB',
      })
    },

    guestListensForHostOffer() {
      socketListen('SERVER_SENT_HOST_TO_GUEST', (message) => {
        useAssert(message.type === 'SERVER_SENT_HOST_TO_GUEST')

        send({
          type: 'Host sent offer',
          iceCandidates: message.iceCandidates,
          sdp: message.sdp,
        })
      })
      console.log('guestListensForHostOffer')
    },

    guestSendsJoinRequest({ context }) {
      socketSend({
        type: 'GUEST_REQUESTS_TO_JOIN',
        hostSessionId: context.enemy.sessionId!,
        guestSessionId: context.me.sessionId!,
      })
    },

    guestChecksHostOffer({ context }) {
      if (context.enemy.sdp) {
        send({
          type: 'Found host offer',
        })
      }
    },

    assignHostOffer: assign({
      enemy: ({ context, event }) => {
        useAssert(event.type === 'Host sent offer' || event.type === 'Server confirmed game exists')
        return {
          ...context.enemy,
          sdp: event.sdp,
          iceCandidates: event.iceCandidates,
        }
      },
    }),

    guestAwakesMachineRTC({ context }) {
      machineRTC.send({
        type: 'Awake',
        iceServers: context.iceServers,
        mySessionId: context.me.sessionId!,
        myMode: 'guest',
        enemySessionId: context.enemy.sessionId,
        enemySDP: context.enemy.sdp,
        enemyIceCandidates: context.enemy.iceCandidates,
      })
    },
  },
  guards: {
    isHost: ({ context }) => context.myMode === 'host',
    isGuest: ({ context }) => context.myMode === 'guest',
    isDictionaryNotInitialized: ({ context }) => !context.me.initializedDictionary,
  },
  delays: {
    INITIALIZATION_TIMEOUT: () => {
      // For e2e testing
      const timeout: string | null | number = new URL(document.location.href).searchParams.get('timeout')
      return timeout ? Number.parseInt(timeout) : INITIALIZATION_TIMEOUT
    },
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QFkCGBjAFgSwHZgBkB7AIxIE8A6AZQBswwAHAYgEEB3VAazAG0AGALqJQjIrGwAXbEVwiQAD0QBaAMwAmAGyUALHvUB2TQFZ1ATgMBGABw6ANCHKJjRyv02rbqy6dXGzqgC+gQ5oWHiEpBSUHNxgzHQMjALCSCBiEtKy8koIavwGlAY61halNoY6AQ5OCAYGZpSGmppm1sb+BqqqBsGhGDj4xGRUsTzMAJIABFiouDAQU7ioALZ8QvIZUjJyabnq-Kr8RYaWBWamHWbqNYglxpSWqmY6-MaHmgWtfSBhg5EjGKccYAUXwK3IM0wcwWS1W61SonE22ye0Q6iOx0sJU06ieegKRluCHuj2er3eqk+RmsPz+EWG0TG8TBYAhU1gYFwkim2AgKU2yKyu1A+0+jWs-HMHW8OhaBWJpKeLzeHy+tJCvwGDKio2BYEoxFQEDwUGYClgklQkgNqAAZjaAE4ACgmADkJgAVCasAgTABarG9AHk3QB9b3IEHBgCqnoAlMx6UNdUC4oaiMbTQK0lthTlnN4ivwzJoGgVjJpLA1iZZLOYin4NO9JdZzJo6dqU4DmRms-NKAB1VDbeZTO1ER0cojoHg8yREGayfDoSQJGdzpe4Fc2-kbXNCnYFhBaHSUMxvet6PTPSvGYkvSxuPxmGwGYx16zVzvhbtM-V9iaA7UFyQFQFM0K4BAsDQuMIGOgAbmAU5zLA7DIZAEFzNBsEIoKmRHmiCClOojzWFSr4dDeNyOIgF4PPwbZfp4OhdJYmg6D+-yMnq6ZGmBlAAEqQNgjpgKuppTBQUwrEQEDxDmSIEaioqINi1iFFSVYvEYOgYk8D6VpQH7qDi-BvKx36asmAL-nxmYCcJJpiRJY7SbJ8nMLwliIukh4qYoalyoULRHCq1i2ORmi1riDxHO0BjqOoxg4kYXE6j2AH8aaQkiS50huZCHkKeovl5oRqkINirg2CYJilORbTWMSBxWCc2KvN0njvhq-S-rZvE8JQAAS4g8sVQ4jgV4ETlOUAAK5wDyYkAI6LZazAAOLrctYBrUtmELlMABWRB4IpfnKSKgVVe0jQfp43SWKW9QlLWZyqJQEU6E8Bi2DonjtOlf6DQao2WjJckGsOo4zZOUwLUtUyrTtzAAGJEPNUEIztyN7TtF3lQF+yHPdrGStcKV1qYtYYtoVbuBpPQ-U86jAwNaZDeD41Q5NsPjvDgmegAwsLy7icKUxHSQYBTEtqAkLQ2AwZAzBC6L4sSbIcuWgrSsq3uZX+dduRUm8X1nC4ZyGBptNtpQJjmW2-A2NevTWV2HO9ttSMTcLmDiVwknYHaCPwnLCjK5IsAJMhSFTiaiy4EQPLoLIdqiSsYdrBHUewITxvHgckpfYYJalGbxS1tYuLGexZgXvU5EfOzPGcwaPsQ37AezsHodQOHYCR5aMfwfHW4Z46ayLAPOdD3nBdXUXBTHO4jFUolH6MfYtFVS0jR+P4a+4l0vVav1bfe7jE0w9NAtTpgY1TEQdp2shzDcxyXI8i-b+OovKITbokrGeTQGl3DyhMF1WsHQnwfi-LYBo0o-qt1TFfX2vNb6SVmhBJ+v934YyxosR+EN8H-33EpQBRd6hPlYuoci7EUovB0PeXe9dSKMVMrpfgehWhnxspfACncebyT5nfHB6sxbbgljsKWi4ZY6ytIrZWAcIBqxFlIncsj5bKINgA-MREqTsUeCzKozwLw8NYbUdhbg2wsJcFAkoZhUGZXTFgscOC7TzVoLQKYjAxKMFQGJfAsBYBiNNJMXkuBtioCVgAL0wiaLWyxHTkH0RVG6rxSxuHqBYsB29VDVw8MZDi5kuh6TlM4j2F80EAXcXDKcXifF+ICUErkcAwn1OYKydkeAYnxMSdgZJQS0kUMulQoi14D4+CeFKPhxhClsI0tocsKVjBflxOxfhntBFuKmtg+GTTfH+KYG0kJnT9kDnqffPxtBUDkGQrAORUlZZiWNOQSJqw8bvPScTO4K83D1ncNiF2VZFm1AOBYXQZwuifA4szFxdkhrXM8d445rTgkdPCVcy5DTbn3Mec8hRbyIAfJ6ZCZW3zSW-KASSK4lAjjrOSusphNEIVnGOElDZdUGFs2qdxWpez+aouaScwJmLQnYqgFKm5jA7kPMdE86WrywDvOYAAIRTpgfFCqnkktGUbJekyqxPjLCleo3RigpRaly4yDQAgpT0FUvqArXHItxTco5LTTkSrCf7QOfcphJIXCkil0TpCxOwAktRForQ2koPaJ0zoOWJgEYK91wrDlou9eK9pkr-W9zHCHINQyQ0jKif0qNkAaXHj0q4d8r5zB6UhZYFqnhV7NtKOKZK7tNTJ3kvANIaaRj4QmZVZQphtDXC-NiAIDcrBmGJM8EK5ICjPGStTRFVBEhMFHQY8d5Nzz0LrGY+dz1iRVg4fXBoqhXglA0Fu9ue6Mm5GUHWJ8RxsRnEiuRehbLECfAYm2P6WT-ofkfb2bK8xn1-LyMUz9P1t4RQ0Bs4kX5ChMo2QcHo4H+UZSRQaKD0qUXw1gBuMA85Fxp2kauGDtK31xRdohn9KH2IPh+s+fwb4Pw2Csi6-DoNAI5RAlBSSkEcJxDo7W+2DcSwHFMqZT47QHyeF0F0Sk9QMR6Q7HhkG7chMDicqJGRhVIbySk0ResTw3AvQBuRFweJoq7wuGeLQpka5Vi6KWIIumvYAWFnMAA5DyPpEaBkWcqu8Vzd4UpaGeK0PwtM9IMuKK0dZaXrgQYAp-YqEWbrsQMB25ZNhLUBB3rUF4n0WJPASz9FsWX0w5cwR6nBiMIYoyWnl3I1YbBuBKEYErPQyu02s3WRmL1zJSga1zJ+N8WuCw0ZrSWyrFF6xUZALr6IbYWwvBvHwVFaZHHPD1ZKF5cQNz5fxvT6Cu5Q023vQrgL-ALLOKxHhBhaw-UKC7L8DcShShStNju19eYFqDkW-ug9h7R3uz16wT2LjeHe+9mKYDjJtg-FUQrj1jBA8oMIsz0N5sPzwa-ZC92uGkTaJp+oHgsfgrUi0eHTL3jFHYhiPweOCcTRBI6R0k4EC4IhsnHkE4iEU9Yp9LQFcWGpXItXZ4gKrCSmepwgGXOQeiJI1OSRS3ZErZ0frVRFOG7w-0iYBZjcfCo+Z3Ymu9QrD1lx753ZyL+djlyweI1lV2KtCaAs4o75J2vg+7vA4RlP0WAOKrr8nEXfpqJ5mxp2axVnI6fd5dZ4XYHCrK8diBk2Flm+x4WT5FKldDx9r8cKeMV5oubDe7rwkqApzyC-PDOTzmUaK+Ndthi6MWd1dvzQrxFZtFbX85UqZU4LlQSxVRKVXvMb-Qh4ekfCGAsPRUPELw+2Mm9iMBBwWGV+J9X8fPq69T6r7P3VzzQvYEjQkktwzUmN8QY8C89Z7WlDeDa825wXpTxUsfMh9XdE9R9k9z9c1J8wdA1g1ZBy179H8Nsvcx1MkpQr1W888wUWoAYzwXB50kpb12cdNgggA */
  id: 'MachineLobby',

  context: {
    myMode: 'not-set',
    iceServers: [],
    locale: DEFAULT_LOCALE,

    me: new PlayerConnectionInfo(),
    enemy: new PlayerConnectionInfo(),
  },

  states: {
    Sleep: {
      on: {
        Awake: {
          target: 'Awake',
          actions: ['assignMyMode', 'assignLocale', 'assignMyName'],
          reenter: true,
        },
      },
    },

    Awake: {
      initial: 'Loading',

      states: {
        'Loading': {
          tags: 'loading',
          initial: 'Waiting for socket to connect',

          states: {
            'Waiting for socket to connect': {
              on: {
                'Socket connected': 'Sending handshake',
              },
            },

            'Sending handshake': {
              on: {
                'Server answered handshake': {
                  target: 'Redirecting by mode',
                  actions: [
                    'assignMySessionId',
                    'assignIceServers',
                    'assignEnemySessionId',
                    'assignMyId',
                  ],
                },
              },

              entry: 'sendHandshake',
            },

            'Redirecting by mode': {
              always: [{
                target: '#MachineLobby.Awake.Host mode',
                guard: 'isHost',
              }, {
                target: '#MachineLobby.Awake.Guest mode',
                guard: 'isGuest',
              }, '#MachineLobby.Awake.Wrong mode'],
            },
          },

          after: {
            INITIALIZATION_TIMEOUT: 'Can\'t initialize',
          },
        },

        'Can\'t initialize': {
          entry: 'callErrorInitializationTimeout',
        },

        'Host mode': {
          states: {
            'Waiting for guest request': {
              on: {
                'Guest requested to join': {
                  target: 'Waiting for guest request',
                  reenter: true,
                  actions: 'assignEnemySessionId',
                },

                'Found guest request': 'Waiting for RTCConnection to be established',
              },

              entry: 'hostChecksGuestSessionId',
            },

            'Waiting for RTCConnection to be established': {
              entry: 'hostAwakesMachineRTC',

              on: {
                'RTCConnection established': '#MachineLobby.Awake.Waiting for full prepareness',
              },
            },
          },

          initial: 'Waiting for guest request',
          entry: ['hostInitsURL', 'hostListensForGuestRequest'],
        },

        'Guest mode': {
          tags: 'waiting-for-host',

          states: {
            'Checking if game exists': {
              on: {
                'Server did not confirm game exists': 'Error: host not found',
                'Server confirmed game exists': {
                  target: 'Waiting for host offer',
                  actions: ['assignHostOffer', 'guestSendsJoinRequest'],
                },
              },

              entry: 'guestChecksIfGameExists',
            },

            'Waiting for host offer': {
              on: {
                'Host sent offer': {
                  target: 'Waiting for host offer',
                  reenter: true,
                  actions: 'assignHostOffer',
                },

                'Found host offer': 'Waiting for RTCConnection to be established',
              },

              entry: 'guestChecksHostOffer',
            },

            'Error: host not found': {
              entry: 'callErrorHostNotFound',
            },

            'Waiting for RTCConnection to be established': {
              entry: 'guestAwakesMachineRTC',

              on: {
                'RTCConnection established': '#MachineLobby.Awake.Waiting for full prepareness',
              },
            },
          },

          initial: 'Checking if game exists',
          entry: 'guestListensForHostOffer',
        },

        'Wrong mode': {
          entry: 'callErrorWrongMode',
        },

        'Waiting for full prepareness': {
          tags: 'connection-established',

          states: {
            'Waiting': {
              initial: 'Waiting for players to be ready',

              states: {
                'Waiting for players to be ready': {
                  entry: 'checkIfPlayersReady',

                  on: {
                    'I am ready': {
                      target: 'Waiting for players to be ready',
                      reenter: true,
                      actions: ['assignMeReadyTrue', 'sendMeReadyToEnemy'],
                    },

                    'Enemy is ready': {
                      target: 'Waiting for players to be ready',
                      reenter: true,
                      actions: 'assignEnemyReadyTrue',
                    },

                    'Both players ready': 'Waiting for players to initialize dictionary',
                  },
                },

                'Waiting for players to initialize dictionary': {
                  entry: 'checkIfPlayersInitializedDictionary',
                },
              },

              on: {
                'I initialized dictionary': {
                  target: 'Waiting',
                  actions: ['assignMeInitializedDictionaryTrue', 'sendMeInitializedDictionaryToEnemy'],
                },

                'Enemy initialized dictionary': {
                  target: 'Waiting',
                  actions: 'assignEnemyInitializedDictionaryTrue',
                },
              },
            },

            'Checking if dictonary initialized': {
              after: {
                100: {
                  target: 'Checking if dictonary initialized',
                  reenter: true,
                  guard: 'isDictionaryNotInitialized',
                },
              },

              entry: 'checkIfDictionaryInitialized',
            },
          },

          entry: ['listenForReadyAndDictionary', 'listenForInfo', 'sendMyInfo'],
          type: 'parallel',
        },
      },

      on: {
        'Sleep': 'Sleep',

        'I changed name': {
          actions: 'iChangedName',
        },

        'Enemy changed name': {
          actions: 'enemyChangedName',
        },

        'Enemy sent id': {
          actions: 'assignEnemyId',
        },
      },

      exit: ['sleepMachineRTC', 'sleepMachineSocket', 'restoreContext'],
      entry: 'awakeMachineSocket',
    },
  },

  initial: 'Sleep',
})

const snapshot = shallowRef(getInitialSnapshot(MachineLobby))

const actorRef = createActor(MachineLobby, DEBUG_INSPECTOR
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

const machineLobby = {
  snapshot,
  send,
}

export {
  machineLobby,
}
