import { createActor, enqueueActions, getInitialSnapshot, setup } from 'xstate'
import { shallowRef } from 'vue'
import { createBrowserInspector } from '@statelyai/inspect'
import { Engine } from './Engine'
import { DEBUG_INSPECTOR } from '@/composables/useConstants'
import { useAssert } from '@/composables/useAssert'

const POSITION_RECOVER_TIMEOUT = 750

const MachineGraphics = setup({
  types: {} as {
    tags: 'waiting'
    context: {
      engine: Engine
      DOMLoaded: boolean
    }
    events:
      {
        type: 'Awake'
        canvas: HTMLCanvasElement
      } |
      {
        type: 'DOM was loaded'
      } |
      {
        type: 'Game started'
      } |
      {
        type: 'Player guessed word'
        word: string
        mode: PlayerModes
      } |
      {
        type: 'Player won'
        mode: PlayerModes
      } |
      {
        type: 'Round restarted'
      } |
      {
        type: 'Reset'
      } |
      {
        type: 'Game stopped'
      }
  },
  actions: {
    assignEngine: enqueueActions(({ enqueue, event }) => {
      useAssert(event.type === 'Awake')
      const engine = new Engine(event.canvas)

      enqueue.assign({
        engine,
      })
    }),

    async initWaiting({ context }) {
      await context.engine.objects.addBg()
      await context.engine.objects.addClouds()
      await context.engine.objects.addCranes()
    },

    async animatePositionIdle({ context }) {
      await context.engine.objects.animateFightersIdle()
    },

    async animatePositionWordGuessed({ context, event }) {
      useAssert(event.type === 'Player guessed word')

      let sx = 0
      const length = event.word.length

      if (length >= 4 && length < 6)
        sx = 1080
      else if (length >= 6)
        sx = 2160

      if (event.mode === 'host')
        await context.engine.objects.animateFightersHostGuessedWord(sx)
      else await context.engine.objects.animateFightersGuestGuessedWord(sx)
    },

    async animatePositionPlayerWon({ context, event }) {
      useAssert(event.type === 'Player won')

      if (event.mode === 'host')
        await context.engine.objects.animateFightersHostWon()
      else await context.engine.objects.animateFightersGuestWon()
    },
  },

  delays: {
    POSITION_RECOVER_TIMEOUT,
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QFkCGBjAFgSwHZgHEAnVABx3VgDoB1VbAFzygGIDUBbMAAlgdSINIAbQAMAXUShSAe1iNsM3FJAAPRAFoAjAGYAHFX0A2ACwAmE1q0mdp3QBoQAT01ajZqhYCcegOwmAViMjHS0AgF9wxzQsPEIScmxKKnYuXn5BSBYABQAbVCcwIm4oAFc4WEhuAHcZIggxSSQQWXkmJRV1BC1RHV9PKytLE18dAPNHFwQNUSpTUQC9UV9-LTMxs1E9SOiMHHxiMgpqVJ4+ASEIHPzC4trcRpVWhQ7mrp6TIyo9NaMvXy8Jl6Oh0ZkmrlMngCoJMekB-j0IJ2IBi+3iRySJ04ZwylzY2PSMlIpBEEiecheyjerjGVCBPhMXkWoiM0N64IQm1mIKMugs-kCNmRqLih0SyVO6QukFo9CYuCg3AYMm4RDA6BkADcitxnu1cCxVOchFRUAAzIREAAU2QA8gBlACSABVHbaAHIAfQASgBRADCtoAar7vZ7XchfbaAKrOgCULBFBwSxxSBPOmQgsoUCqVKrVGu1xT1igeZOaJdeoC6QNmRh+TPcPzG+gCHI0fyoAS8oi861G9Z+Wm2URRe1FKcx2flirNdVVYA4qAYWBY3pkpVwEAXGcujwrFP1nUQ-n6PjWXhC-iMvnG7Z0oi0VDcrOWa18ul8ohMwvHyYxyT2rkYBgKQLAAILVKgADWYD7tIh6lse0yLDoVCXgEZh-LCtjmHo7ZaCsnhAlYfi6AscI6L+sT-uK1B0Dms7zmqS4rpg+JpHwRIkg05YIW0SHUtMvxUCyRhbHoZgrP8awcqEsyDEO3bWFY4yRKOuAyBAcAqEm6J0eSAlVmomhLGhIxbLyYQBI+Kz3noBjBKyD6iGYTLkb41FomKqYMTOhmUshGi2AYIysnophwlJOgESEonrPJPbjD0ESjnpPlTpKu6QAFR5Cb4Hg-B+fi2AEViiK5sVeHMixuNYrZ9H2XkTgBWKcbiMp+cweYLoWOqVlS-GBUJayzEVw4DmVPSVc4mgfqJPZeH0viIvJBXNbRqZZR1WaOhAwG6ohxkDchH7VQsbi9lNAQrG2s3TJJz61eJrJWMEXhaBt+m+XK3VzsULHLlguWCdWiC6JYcwVVsWERaMfgEZDmE3rZBVuZJI67DR31TkBIGkCDxldBot4BHSX4RapNmEb4BHjF2uhBFYgJiT+6lAA */
  context: {
    // @ts-expect-error undefined
    engine: undefined,
    DOMLoaded: false,
  },

  id: 'MachineGraphics',

  states: {
    'Waiting': {
      tags: ['waiting'],
      entry: ['initWaiting'],

      on: {
        'Game started': {
          target: 'Game started',
          actions: 'animatePositionIdle',
        },
      },
    },

    'Game started': {
      on: {
        'Player guessed word': {
          target: 'Game started',
          actions: 'animatePositionWordGuessed',
        },

        'Player won': {
          target: 'Waiting for rematch',
          actions: 'animatePositionPlayerWon',
        },

        'Game stopped': 'Waiting',
      },

      states: {
        'Waiting to recover position': {
          after: {
            POSITION_RECOVER_TIMEOUT: 'Idle position',
          },
        },

        'Idle position': {
          entry: 'animatePositionIdle',
        },
      },

      initial: 'Waiting to recover position',
    },

    'Waiting for rematch': {
      on: {
        'Round restarted': {
          target: 'Game started',
          actions: 'animatePositionIdle',
        },

        'Game stopped': {
          target: 'Waiting',
          reenter: true,
        },
      },
    },

    'Sleep': {
      on: {
        Awake: {
          target: 'Waiting',
          actions: 'assignEngine',
        },
      },
    },
  },

  initial: 'Sleep',
})

const snapshot = shallowRef(getInitialSnapshot(MachineGraphics))

const actorRef = createActor(MachineGraphics, DEBUG_INSPECTOR
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

const machineGraphics = {
  snapshot,
  send,
}

export {
  machineGraphics,
}
