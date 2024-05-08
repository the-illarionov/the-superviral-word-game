/* eslint ts/no-use-before-define: 0 */

import type { DoneActorEvent } from 'xstate'
import { assign, createActor, enqueueActions, fromPromise, getInitialSnapshot, setup } from 'xstate'
import { shallowRef } from 'vue'
import { createBrowserInspector } from '@statelyai/inspect'
import { socketListen, socketSend } from '../MachineSocket/MachineSocket'
import { machineLobby } from '../MachineLobby/MachineLobby'
import { machineApp } from '../MachineApp/MachineApp'
import { useAssert } from '@/composables/useAssert'
import { DEBUG_INSPECTOR } from '@/composables/useConstants'

const PING_DELAY = 5000
const GUEST_PING_TIMEOUT = PING_DELAY * 2

const MachineRTC = setup({
  types: {} as {
    tags: 'connected'
    context: {
      peerConnection: RTCPeerConnection | undefined
      iceServers: RTCIceServer[]
      mySessionId: string
      myMode: PlayerModes
      mySDP: RTCSessionDescriptionInit | undefined
      channel: RTCDataChannel | undefined
      messageListener: RTCMessageListener
      pongReceived: boolean

      enemySessionId: string | undefined
      enemySDP: RTCSessionDescriptionInit | undefined
      enemyIceCandidates: RTCIceCandidate[]
    }
    events:
      {
        type: 'Awake'
        iceServers: RTCIceServer[]
        mySessionId: string
        myMode: PlayerModes
        enemySessionId: string | undefined
        enemySDP: RTCSessionDescriptionInit | undefined
        enemyIceCandidates: RTCIceCandidate[]
      } |
      {
        type: 'Sleep'
      } |
      {
        type: 'Guest requested to join'
      } |
      {
        type: 'Datachannel was opened'
        channel: RTCDataChannel
      } |
      {
        type: 'Send message'
        data: RTCMessage
      } |
      {
        type: 'Add listener'
        data: { type: RTCMessage['type'], callback: Function }
      } |
      {
        type: 'Message received'
        data: RTCMessage
      } |
      {
        type: 'Guest sent pong'
      } |
      {
        type: 'Host sent ping'
      }
  },
  actions: {
    assignContext: assign(({ event }) => {
      useAssert(event.type === 'Awake')
      return {
        iceServers: event.iceServers,
        mySessionId: event.mySessionId,
        myMode: event.myMode,
        enemySessionId: event.enemySessionId,
        enemySDP: event.enemySDP,
        enemyIceCandidates: event.enemyIceCandidates,
      }
    }),

    initPeerConnection: enqueueActions(({ enqueue, context }) => {
      const peerConnection = new RTCPeerConnection({
        iceServers: context.iceServers,
      })

      enqueue.assign({
        peerConnection,
      })

      peerConnection.onicecandidate = ({ candidate }) => {
        window.___e2e.iceCandidates.push(candidate!)

        socketSend({
          type: 'PLAYER_GENERATED_ICE_CANDIDATE',
          sessionId: context.mySessionId,
          candidate,
        })

        console.log('peerconnection.onicecandidate', candidate)
      }

      socketListen('SERVER_SENT_ENEMY_ICE_CANDIDATE', (message) => {
        useAssert(message.type === 'SERVER_SENT_ENEMY_ICE_CANDIDATE')

        // @ts-expect-error wrong type
        peerConnection.addIceCandidate(message.candidate)

        console.log('SERVER_SENT_ENEMY_ICE_CANDIDATE', message.candidate)
      })
    }),

    initDataChannel({ context }) {
      function onChannelOpen(channel: RTCDataChannel) {
        send({
          type: 'Datachannel was opened',
          channel,
        })

        channel.onmessage = (e) => {
          const message = JSON.parse(e.data) as RTCMessage

          send({
            type: 'Message received',
            data: message,
          })
        }
      }

      if (context.myMode === 'host') {
        const channel = context.peerConnection!.createDataChannel('game')

        channel.onopen = () => {
          onChannelOpen(channel)

          console.log('host opened datachannel')
        }
      }
      else if (context.myMode === 'guest') {
        context.peerConnection!.ondatachannel = ({ channel }) => {
          onChannelOpen(channel)

          console.log('guest opened datachannel')
        }
      }

      console.log('initDataChannel')
    },

    closePeerConnection({ context }) {
      RTCsend({
        type: 'CLOSE',
      })
      context.peerConnection!.close()
    },

    restoreContext: assign({
      peerConnection: undefined,
      messageListener: {},
      iceServers: [],
      mySessionId: '',
      myMode: 'not-set',
      mySDP: undefined,
      channel: undefined,
      pongReceived: true,

      enemySessionId: '',
      enemySDP: undefined,
      enemyIceCandidates: [],
    }),

    assignDatachannel: assign({
      channel: ({ event }) => {
        useAssert(event.type === 'Datachannel was opened')

        return event.channel
      },
    }),

    sendLobbyConnectionEstablished() {
      machineLobby.send({
        type: 'RTCConnection established',
      })
    },

    listenForClose() {
      RTClisten('CLOSE', () => {
        machineApp.send({
          type: 'Critical error occured',
          errorType: 'ENEMY_DISCONNECTED',
        })
      })
    },

    sendMessage({ context, event }) {
      useAssert(event.type === 'Send message')
      console.log('sendMessage rtc', event.data)
      if (context.channel && context.channel.readyState === 'open') {
        context.channel!.send(JSON.stringify(event.data))
      }
      else {
        machineApp.send({
          type: 'Critical error occured',
          errorType: 'ENEMY_DISCONNECTED',
        })
      }
    },

    addListener: assign({
      messageListener: ({ context, event }) => {
        useAssert(event.type === 'Add listener')
        return {
          ...context.messageListener,
          [event.data.type]: event.data.callback,
        }
      },
    }),
    proccessMessage: enqueueActions(({ context, event, enqueue }) => {
      useAssert(event.type === 'Message received')
      const message = event.data

      if (message.type === 'PING') {
        enqueue.assign({
          pongReceived: true,
        })
      }

      if (context.messageListener[message.type])
        context.messageListener[message.type]!(message)

      console.log('proccessMessage rtc', event)
    }),

    assignpongReceivedTrue: assign({
      pongReceived: true,
    }),

    // HOST
    hostAssignsOffer: assign({
      mySDP: ({ event }) => (event as unknown as DoneActorEvent<RTCSessionDescriptionInit>).output,
    }),

    hostListensForGuestAnswer({ context }) {
      socketListen('SERVER_SENT_GUEST_TO_HOST', async (message) => {
        useAssert(message.type === 'SERVER_SENT_GUEST_TO_HOST')

        await context.peerConnection!.setRemoteDescription(message.sdp)

        message.iceCandidates.forEach((candidate) => {
          context.peerConnection!.addIceCandidate(candidate)
          console.log('host adds guest candidates', candidate)
        })
      })
      console.log('hostListensForGuestAnswer')
    },

    hostSendsOfferToGuest({ context }) {
      socketSend({
        type: 'HOST_SENT_OFFER',
        sessionId: context.mySessionId,
        offer: context.mySDP!,
      })
      console.log('hostSendsOfferToGuest')
    },

    hostListensForPong() {
      RTClisten('PONG', () => {
        send({
          type: 'Guest sent pong',
        })
      })
    },

    hostSendsPing: enqueueActions(({ enqueue, context }) => {
      if (context.pongReceived) {
        enqueue.raise({
          type: 'Send message',
          data: {
            type: 'PING',
          },
        })

        enqueue.assign({
          pongReceived: false,
        })
      }
      else {
        machineApp.send({
          type: 'Critical error occured',
          errorType: 'ENEMY_DISCONNECTED',
        })
      }

      console.log('hostSendsPing')
    }),

    assignPongReceivedTrue: assign({
      pongReceived: true,
    }),

    // GUEST
    guestAssignsAnswer: assign({
      mySDP: ({ event }) => (event as unknown as DoneActorEvent<RTCSessionDescriptionInit>).output,
    }),

    guestSendsAnswerToHost({ context }) {
      socketSend({
        type: 'GUEST_SENT_ANSWER',
        answer: context.mySDP!,
        sessionId: context.mySessionId,
        hostSessionId: context.enemySessionId!,
      })
    },

    guestListensForPing() {
      RTClisten('PING', () => {
        send({
          type: 'Host sent ping',
        })
      })
    },

    guestSendsPongToHost() {
      RTCsend({
        type: 'PONG',
      })
    },

    callErrorEnemyDisconnected() {
      machineApp.send({
        type: 'Critical error occured',
        errorType: 'ENEMY_DISCONNECTED',
      })
    },
  },
  actors: {

    // HOST
    hostCreatesOffer: fromPromise<RTCSessionDescriptionInit, { peerConnection: RTCPeerConnection }>(async ({ input }) => {
      const offer = await input.peerConnection.createOffer()
      await input.peerConnection.setLocalDescription(offer)

      return offer
    }),

    // GUEST
    guestCreatesAnswer: fromPromise<RTCSessionDescriptionInit, { peerConnection: RTCPeerConnection, hostOffer: RTCSessionDescriptionInit, hostIceCandidates: RTCIceCandidate[] }>(async ({ input }) => {
      console.log('guestCreatesAnswer:before', input.hostOffer)
      input.peerConnection.setRemoteDescription(input.hostOffer)

      input.hostIceCandidates.forEach((candidate) => {
        console.log('guest adds host candidate', candidate)
        input.peerConnection.addIceCandidate(candidate)
      })

      const answer = await input.peerConnection.createAnswer()
      await input.peerConnection.setLocalDescription(answer)

      console.log('guestCreatesAnswer:after')
      return answer
    }),
  },
  guards: {
    isHost: ({ context }) => context.myMode === 'host',
    isGuest: ({ context }) => context.myMode === 'guest',
  },
  delays: {
    PING_DELAY,
    GUEST_PING_TIMEOUT,
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QFkCGBjAFgSwHZgCUAVAYQDoBBAd1QGswBiAZQBswwAHAbQAYBdRKA4B7WNgAu2YbkEgAHogC0ARgDsPMsoBMAVmU8AnABZlBnjoBsxgDQgAnoi1aAzGR09DPC8p1aDFvSMAXyDbNCw8QlJKGnoyAkhsACcwdElcKAACACM7TIBbYQhGXgEkEBExSWlZBQQtVQsyHi0eI0atC2cDS1VbB3qdHTInVR1VXUtlZWdnELCMHHxicmo6MHjElLS8LNyCopLlMqFRCSkZcrrdJuc1Z1UADj09Lwb+xAsrEd8-VSMho8GhZ5iBwksoqtYhsABKicRkEgpVDpLLCABm6LASQYEGkGzwADdhHFMPCkWAUXAAPKY7GlWSVc41K6IAzaMgBAGPVSNEyGR4fBDOdxkCaPEyPIGPZwNVRzUJgxaRFYxdZkOGwBEAdVQ5wymXRwiSmSgAFc4OJMqhcLAqNiGAARFGLG34FiZGiwTLCDhgfAQBnlJnVS6gOo+AwGZrOL5jWU6IxOHRCpNaZptcxGAH+DztUHglXRNZxADiFq1iORqOttvtOLx+DIRJJG3NlopVNgFDr9P4jLOodqbJ8bgsPGmPSnFgBQv+6a6Y20TyX2YLyuWxehZHLlrITH9EF2tbt2My4mEmTJWqdLqwbrAHq9Pr9AaDpyqF2HCEj0Z4sYseNdDTFN7EQVQozcF5OhMZweFUbR1wiTcoXVEhpHwNJIDIAAZbAtX9Y8jRNfI4FgVAYFgZhDwKMiKLAd8KkHL9WXqfQmgCZ4Z0Avw9CFfQ1DIKUoylIFZUeZRgkVQsULVOJ0NwTDxGwvCCNwIjjVo2ByMohgKAgCBMhYfDlPwJJGJDFjw0caYmn0ZxngMWM-FmPowJ-LRszcBztE6OCZksJCIVVEsNgUpSVJMwiDWIrSdLgBhkDomBMm2MBsEJSALOYllrPqAFVDIdo9CcCwGnGQV3IEwrhIMUSXC0CSpIWZDITksKMNSZSIDIAAFXZdk2I9thrfZCmKBhss-XL5EcfxlE5dkZnMf9Hic-jpgXO5HnMHzx0Q6SNza0LEU6rCev6jJBoSYauuPMbDkm44B2msNZvqYwFrqiC1CMbojEA-iEKaSwyvMOqAXgkFDtakLt3CrrsMuqBBs1BFkd2Bhdy1TJYH9K0RAyKbmTeupxOjToLB5WUIIldaqoatwnmlCCKoMIKi1Q+Szu6vqBoyDV4T5q6MgYOQtSpMhUHRZSkgACl6gBJAA5UsAH1HQAURwigAE0AEpEqOuG0J5pH+agQXKwxon+2DHLScQWZlEeZoIIcqUJj8KV+IBdMPB5TjxjGAEOdkk6EfO4WUYF7GEVU0yNJNDhMbR3H8cyFPbZOJjXu-WURWaLojDWnpJM85x+JlVw2ilEU1r0MYtDD474bNi6LZ3Ct46i9SYs0rOoDFiXlKlmXsTl0sAFVNaYIg1aV1W1aIRXkE16kp6IQ2ZNb03FMRjuRctuPcN7pPM92Ymh1Y5w-oWnhnn-ZQZxlF2jH4-xXCpriysanRY1UC3VUrB2AcD0tCK+Vl3oqEeCDAG-gILZgfu0NyAwnBuD+mtO4RgBRrUkiERUuBDjwHKDvFYL0SbfkUA5dMkkJhlXaAYFwAJ37uUUDOMgPRxyNQ8Ood2gCYbBS3OsCh188r6DIA5AG7gHK8haBMVMGg2hOFlF4BMdxPJAOEXEG6yQ7oGgesUURUC6g6FdlIgIq05ENC0EKXQ6YDC8ksH4Jhpd4JaK5rCeExiZp1ABK4UwhhFyiRLv-OxvgMFOG0GVHw3RngePalbBEnYawYixEkHxjsEDuAWoEz+zMJTPEru5W+rsWGOMApYP6sYEknTRmQXU+osixXbDjG0p4Mn2zzqxbQOCRi7TaDTEusYhS3yUUmGYDwrDjiarU7ccdMnfgBLk+UEkZjGCcYDdyM5XCxm6LKMwTCjBRjmeqE+KTjztPrIs1ixzoz3DWf9TZqDwJwSEjOf83hjCAmakqWG2iNgnwPLgI8BorlngvFebxXTKE9NMEYGMAMrB-R2V8OcfTYw4L5E5J4MxTnc33udG5eVWhmM5GYqpPEy5zjqm7KUJgAbYIlPijqhLeYJ2is0zSpFtL0RIR+WFJLPJ-kkjtVoDRswzg2kMEYLg4wov+ECFlp02XmyPsS96nRHFCWGR8h4O1ikDAEhoCqModBOUAk5BULUhGeJVRFQ+MdLa6JGvdPI40wAauuP8YYhTMX-ieP+DaEifLu0MHI2+yrI68xtpbNGXqnaSRri0HB4NJSgSNQKOlYx1CFO8DoKN7do6oyFrGhNwpTD3xTR4c16b+IigRSKL4uheSSS8IW1VjrBoLJhWI962DCotHNc-Zxz8Hj8SsK7RMa1GVaFFU8DtDri2x27qfNS59B7lruD0Zouh2QBBiYuD+XRORSlraJJh1q-m2sSdGtVTqu57k1kkJIxoECZH9GAfIeQjywHQO3LdCFXb2LMb03yklj1fzPcYC9LgEkgM4OW6ht9NDtE6J5CCzDEypmGA0NouLm2VuhiEIAA */
  id: 'MachineRTC',

  context: {
    peerConnection: undefined,
    messageListener: {},
    iceServers: [],
    mySessionId: '',
    myMode: 'not-set',
    mySDP: undefined,
    channel: undefined,
    pongReceived: true,

    enemySessionId: '',
    enemySDP: undefined,
    enemyIceCandidates: [],
  },

  states: {
    Awake: {
      initial: 'Redirecting by mode',

      states: {
        'Redirecting by mode': {
          always: [{
            target: 'Host',
            guard: 'isHost',
          }, {
            target: 'Guest',
            guard: 'isGuest',
          }],
        },

        'Host': {
          states: {
            'Creating offer': {
              invoke: {
                src: 'hostCreatesOffer',
                id: 'hostCreatesOffer',
                input: ({ context }) => ({
                  peerConnection: context.peerConnection!,
                }),
                onDone: {
                  target: 'Waiting for guest answer',
                  actions: 'hostAssignsOffer',
                },
              },
            },

            'Waiting for guest answer': {
              entry: ['hostListensForGuestAnswer', 'hostSendsOfferToGuest'],

              on: {
                'Datachannel was opened': '#MachineRTC.Awake.Connected',
              },
            },
          },

          initial: 'Creating offer',
        },

        'Guest': {
          states: {
            'Creating answer': {
              invoke: {
                src: 'guestCreatesAnswer',
                id: 'guestCreatesAnswer',

                input: ({ context }) => ({
                  peerConnection: context.peerConnection!,
                  hostOffer: context.enemySDP!,
                  hostIceCandidates: context.enemyIceCandidates,
                }),

                onDone: {
                  target: 'Sending answer to host',
                  actions: 'guestAssignsAnswer',
                },
              },
            },

            'Sending answer to host': {
              entry: 'guestSendsAnswerToHost',

              on: {
                'Datachannel was opened': '#MachineRTC.Awake.Connected',
              },
            },
          },

          initial: 'Creating answer',
        },

        'Connected': {
          tags: 'connected',
          entry: ['assignDatachannel', 'sendLobbyConnectionEstablished', 'listenForClose'],
          type: 'parallel',

          states: {
            'Listening for messages': {
              on: {
                'Send message': {
                  target: 'Listening for messages',
                  actions: 'sendMessage',
                },

                'Add listener': {
                  target: 'Listening for messages',
                  actions: 'addListener',
                },

                'Message received': {
                  target: 'Listening for messages',
                  actions: 'proccessMessage',
                },
              },
            },

            'Pinging': {
              states: {
                'Redirecting by mode': {
                  always: [{
                    target: 'Host',
                    guard: 'isHost',
                  }, {
                    target: 'Guest',
                    guard: 'isGuest',
                  }],
                },

                'Host': {
                  initial: 'Pinging',

                  states: {
                    Pinging: {
                      after: {
                        PING_DELAY: {
                          target: 'Pinging',
                          reenter: true,
                          actions: 'hostSendsPing',
                        },
                      },

                      on: {
                        'Guest sent pong': {
                          target: 'Pinging',
                          actions: 'assignPongReceivedTrue',
                        },
                      },
                    },
                  },

                  entry: 'hostListensForPong',
                },

                'Guest': {
                  states: {
                    'Listening for ping': {
                      on: {
                        'Host sent ping': {
                          target: 'Listening for ping',
                          reenter: true,
                          actions: 'guestSendsPongToHost',
                        },
                      },

                      after: {
                        GUEST_PING_TIMEOUT: 'Error: enemy disconnected',
                      },
                    },

                    'Error: enemy disconnected': {
                      entry: 'callErrorEnemyDisconnected',
                    },
                  },

                  initial: 'Listening for ping',
                  entry: 'guestListensForPing',
                },
              },

              initial: 'Redirecting by mode',
            },
          },
        },
      },

      on: {
        Sleep: 'Sleep',
      },

      entry: ['initPeerConnection', 'initDataChannel'],
      exit: ['closePeerConnection', 'restoreContext'],
    },

    Sleep: {
      on: {
        Awake: {
          target: 'Awake',
          actions: 'assignContext',
        },
      },
    },
  },

  initial: 'Sleep',
})

function RTCsend(data: RTCMessage) {
  send({
    type: 'Send message',
    data,
  })
}

function RTClisten(type: RTCMessage['type'], callback: (message: RTCMessage) => void) {
  send({
    type: 'Add listener',
    data: {
      type,
      callback,
    },
  })
}

const snapshot = shallowRef(getInitialSnapshot(MachineRTC))

const actorRef = createActor(MachineRTC, DEBUG_INSPECTOR
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

const machineRTC = {
  snapshot,
  send,
}

export {
  machineRTC,
  RTCsend,
  RTClisten,
}
