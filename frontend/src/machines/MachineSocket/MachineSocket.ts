/* eslint ts/no-use-before-define: 0 */

import { assign, createActor, fromCallback, getInitialSnapshot, raise, setup } from 'xstate'
import type { EventObject } from 'xstate'
import { shallowRef } from 'vue'
import { createBrowserInspector } from '@statelyai/inspect'
import { machineApp } from '../MachineApp/MachineApp'
import { machineLobby } from '../MachineLobby/MachineLobby'
import { useAssert } from '@/composables/useAssert'
import { DEBUG_INSPECTOR } from '@/composables/useConstants'

const PING_DELAY = 25000
const MachineSocket = setup({
  types: {} as {
    context: {
      socket: WebSocket | undefined
      messageListener: WebSocketMessageListener
      myMode: PlayerModes
    }
    events:
      {
        type: 'Awake'
        myMode: PlayerModes
      } |
      {
        type: 'Sleep'
      } |
      {
        type: 'Connected'
        socket: WebSocket
      } |
      {
        type: 'Send message'
        data: WebSocketMessage
      } |
      {
        type: 'Add listener'
        data: { type: WebSocketMessage['type'], callback: Function }
      } | {
        type: 'Message received'
        data: WebSocketMessage
      }
  },

  actions: {
    assignMyMode: assign({
      myMode: ({ event }) => {
        useAssert(event.type === 'Awake')

        return event.myMode
      },
    }),

    initWebSocket() {
      const socket = new WebSocket(import.meta.env.VITE_WEBSOCKET_URL)

      socket.onopen = () => {
        send({
          type: 'Connected',
          socket,
        })

        machineLobby.send({
          type: 'Socket connected',
        })
      }

      socket.onmessage = (e) => {
        const message = JSON.parse(e.data) as WebSocketMessage

        send({ type: 'Message received', data: message })
      }

      return () => {
        socket.send(JSON.stringify({ type: 'CLOSE' }))
        socket.close()
      }
    },
    closeWebSocket({ context }) {
      console.log('websocket close')
      if (context.socket && context.socket.readyState === context.socket.OPEN) {
        context.socket.send(JSON.stringify({ type: 'CLOSE' }))
        context.socket.close()
      }
    },

    restoreContext: assign({
      socket: undefined,
      messageListener: {},
      myMode: 'not-set',
    }),

    assignWebSocket: assign({
      socket: ({ event }) => {
        useAssert(event.type === 'Connected')

        return event.socket
      },
    }),

    sendMessage({ context, event }) {
      useAssert(event.type === 'Send message')
      if (context.socket && context.socket.readyState === context.socket.OPEN) {
        context.socket.send(JSON.stringify(event.data))
      }
      else {
        machineApp.send({
          type: 'Critical error occured',
          errorType: 'SOCKET_ERROR',
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
    proccessMessage({ context, event }) {
      useAssert(event.type === 'Message received')
      const message = event.data

      if (message.type === 'ERROR') {
        machineApp.send({
          type: 'Critical error occured',
          errorType: message.errorType,
        })
      }

      else if (context.messageListener[message.type]) {
        context.messageListener[message.type]!(message)
      }
    },

    sendPing: raise({
      type: 'Send message',
      data: {
        type: 'PING',
      },
    }),
  },
  actors: {
    initWebSocket: fromCallback<EventObject, {
      myMode: PlayerModes
    }>(({ sendBack }) => {
      const socket = new WebSocket(import.meta.env.VITE_WEBSOCKET_URL)

      socket.onopen = () => {
        sendBack({
          type: 'Connected',
          socket,
        })

        machineLobby.send({
          type: 'Socket connected',
        })
      }

      socket.onmessage = (e) => {
        const message = JSON.parse(e.data) as WebSocketMessage

        sendBack({ type: 'Message received', data: message })
      }

      return () => {
        socket.send(JSON.stringify({ type: 'CLOSE' }))
        socket.close()
      }
    }),
  },
  delays: {
    PING_DELAY,
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QGUD2BjA1mALgWQEN0ALASwDswA6ZAGzDAAcBiAQQHcDsBtABgF1EoRqlikcpVOSEgAHogAcAJioKAzADYAjBoAsGhQHYtuo1oA0IAJ6IlShVTUBWXU8MuFWswE4NAXz9LNCxcQhIKag4uMGY6BkY+QSQQETEJKRl5BC1ebypXNTVDJW8tQ299JQtrRCdeJ1VDVw1eXO9nJScAoIxsfCIySioo7CoAYSlKdAlyKGYJ8imcSESZVPFJaWSs3XaqbyMNTq0DjW9vJUsbBF0lXSoleq03Jz0FFybukGC+sMHIzijBZLSBUAAypFgy3IFCgAAIAGaoABOcIAtnBYAQYLBYmByBB0ZjsWBVsl1uktqAslodIYqBonI9vEzeMVcrorrUvPknEzzi0nGp7Aovj9QgMIsNAdRgWBpqCIVD8bDESiibAsTi2BBCbRIdCwMiycJRBsMttEIZDLwqCcDrxNCy1CyFFyEE4ea5+b56sKFKLAt9ehLwkMRrLJvLlhBwQaVbM1aiMZqSbi8MSYHDkfKwKQAG4rARrM2UzJW3T07yGYXOa01k4ad0adx2613au8MoaAxikP9MMA6LjKMK2MABVhsOYsihBGWVAICOWyIAFOOAJIAOQA4gB9AAiAFEwawAJoASli-b+UojI8W0dBk9msJNKVLm3L2R0DjKLlKHQtCqBQmxqBAWw0BlrTULRYP9CoAiDchUAgOAZHFAd-hLNIv0tBAAFpgKrOClBtW5vHqHtLnAkxbXeVwaz5WCKjUPsQiwqU4iYHDzSpOREAI8p9lI8iSioo53WOKheE8YCLguJpGV0djfklcMZV4st8LIhwlBaA52hdOC9CkooqBtT1BWrJxq28VTQ3+aVhzlaZYS0vDqUQYUoP03IFCM0pNE5cDdH0fZYJrDRChyUw1BUoNMNvDSXNHGMPItLyIPOfYayUOsYMbd1dDUW0WSFXhdjZYw1EDHoOOSocgTSxV4xhRMkWTTN0PJT9MoEhALi0B4Wh7LsKlk2DmzKfIe3cYw9BdYwHM4lLmsfMcqBfKB3N63D+qyathqFXQ2VpM6FBC65rSg2qwoDE53k6JQkL8IA */

  context: {
    myMode: 'not-set',
    socket: undefined,
    messageListener: {},
  },

  id: 'SocketMachine',

  states: {
    Sleep: {
      on: {
        Awake: {
          target: 'Awake',
          actions: 'assignMyMode',
        },
      },
    },

    Awake: {
      initial: 'Connecting',

      states: {
        Connecting: {
          on: {
            Connected: {
              target: 'Connected',
              actions: 'assignWebSocket',
            },
          },
        },

        Connected: {
          type: 'parallel',

          states: {
            'Listening for messages': {
              on: {
                'Send message': {
                  target: 'Listening for messages',
                  actions: 'sendMessage',
                  reenter: true,
                },

                'Add listener': {
                  target: 'Listening for messages',
                  actions: 'addListener',
                  reenter: true,
                },

                'Message received': {
                  target: 'Listening for messages',
                  actions: 'proccessMessage',
                  reenter: true,
                },
              },
            },

            'Pinging': {
              after: {
                PING_DELAY: {
                  target: 'Pinging',
                  actions: 'sendPing',
                  reenter: true,
                },
              },
            },
          },
        },
      },

      on: {
        Sleep: 'Sleep',
      },

      entry: 'initWebSocket',
      exit: ['closeWebSocket', 'restoreContext'],
    },
  },

  initial: 'Sleep',
})

function socketSend(data: WebSocketMessage) {
  send({
    type: 'Send message',
    data,
  })
}

function socketListen(type: WebSocketMessage['type'], callback: (message: WebSocketMessage) => void) {
  send({
    type: 'Add listener',
    data: {
      type,
      callback,
    },
  })
}

const snapshot = shallowRef(getInitialSnapshot(MachineSocket))

const actorRef = createActor(MachineSocket, DEBUG_INSPECTOR
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

const machineSocket = {
  snapshot,
  send,
}

export {
  machineSocket,
  socketSend,
  socketListen,
}
