import { assign, createActor, getInitialSnapshot, setup } from 'xstate'
import { shallowRef } from 'vue'
import { createBrowserInspector } from '@statelyai/inspect'
import { DEBUG_INSPECTOR } from '@/composables/useConstants'
import { useAssert } from '@/composables/useAssert'

const MachineAudio = setup({
  types: {} as {
    context: {
      muted: boolean
      waiting: HTMLAudioElement
      DOMLoaded: boolean
    }
    events:
      {
        type: 'Awake'
        waiting: HTMLAudioElement
      } |
      {
        type: 'Sound on'
      } | {
        type: 'Sound off'
      }
  },
  actions: {
    assignTracks: assign({
      waiting: ({ event }) => {
        useAssert(event.type === 'Awake')
        return event.waiting
      },
    }),
    assignMutedFalse: assign({
      muted: false,
    }),
    assignMutedTrue: assign({
      muted: true,
    }),
    playCurrentTrack({ context }) {
      context.waiting.play()
    },
    stopCurrentTrack({ context }) {
      context.waiting.pause()
    },
  },

}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QFkCGBjAFgSwHZgEEBXCbAewDoBJXbAF21QBtsAvSAYgGUyjcIABGVwBtAAwBdRKAAOZWPXK5pIAB6IAjAE4AHBQ0AWAOwGAbEbFiDAJmNmANCACeiLRoo7rG6561aArEb+1v4GAL5hjmhYeIQk5NS0DMxsnDx8gmQAZlniUkggcgoMwirqCNaWFGLWtuaWNnamji4IAMw+Hl4+1n6BwaERURg4+MSklFxMYGAyHAQA7qgA1mB5KkWKpQXlALTeelbaGm0a-m1mOjpGLYjWHdVaxhrmOqYG1zYRkSC4ZBBwFTRUZxCYbeRbZQ7RC7Nr+UwUUwnfw6DQaSxiQIGAy3BAGCgdA5nYKmLzvLRDEDA2LjBI0RQpdgQcHFJRlRCmBGvIwaCxWWwmZrOO6hLoHXoBIIhcI-aljeKTaazFmQ9kIWFiPRIuGo9GWLE44UVUWebyhNpwtqcrTWb5hIA */
  context: {
    muted: true,
    // @ts-expect-error undefined
    waiting: undefined,
    DOMLoaded: false,
  },

  id: 'MachineAudio',

  states: {
    Initialized: {
      on: {
        'Sound on': {
          target: 'Initialized',
          actions: ['assignMutedFalse', 'playCurrentTrack'],
        },

        'Sound off': {
          target: 'Initialized',
          actions: ['assignMutedTrue', 'stopCurrentTrack'],
        },
      },
    },

    Sleep: {
      on: {
        Awake: {
          target: 'Initialized',
          actions: 'assignTracks',
        },
      },
    },
  },

  initial: 'Sleep',
})

const snapshot = shallowRef(getInitialSnapshot(MachineAudio))

const actorRef = createActor(MachineAudio, DEBUG_INSPECTOR
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

const machineAudio = {
  snapshot,
  send,
}

export {
  machineAudio,
}
