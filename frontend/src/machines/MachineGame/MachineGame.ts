/* eslint ts/no-use-before-define: 0 */

import { assign, createActor, enqueueActions, getInitialSnapshot, setup } from 'xstate'
import { shallowRef } from 'vue'
import { createBrowserInspector } from '@statelyai/inspect'
import { RTClisten, RTCsend, machineRTC } from '../MachineRTC/MachineRTC'
import { machineGraphics } from '../MachineGraphics/MachineGraphics'
import { machineDictionary } from '../MachineDictionary/MachineDictionary'
import type { MachineGameContext, MachineGameEvent } from './types'
import type { Scores } from '@/components/PlayerScores/types'
import { useAssert } from '@/composables/useAssert'
import { DEBUG_GAME, DEBUG_INSPECTOR, DEFAULT_LOCALE } from '@/composables/useConstants'
import { useRandomInRange } from '@/composables/useRandomInRange'
import { useFindPossibleWords } from '@/composables/useFindPossibleWords'

const COUNTDOWN_TIMEOUT = 4000
const VALIDATION_ERROR_TIMEOUT = 1500
const MAIN_WORD_REFRESH_TIMEOUT = 25000

class Player {
  wantsRematch = false
  currentWord = ''
  guessedWords: string[] = []
  hp = 100
  name: string
  id: string
  mode: PlayerModes
  type: PlayerTypes
  validationError: WordValidationError = {
    word: '',
    reason: false,
  }

  constructor(mode: PlayerModes, type: PlayerTypes, name: string, id: string) {
    this.mode = mode
    this.type = type
    this.name = name
    this.id = id
  }
}

let botTimeoutId = 0
let botWords: string[] = []

const MachineGame = setup({
  types: {} as {
    tags: 'main-word-will-be-refreshed-soon' | 'playing' | 'rematch' | 'showing-countdown' | 'validation-error' | 'awake'
    context: MachineGameContext
    events: MachineGameEvent
  },
  actions: {
    initContext: enqueueActions(({ enqueue, event }) => {
      useAssert(event.type === 'Awake')

      enqueue.assign({
        myMode: event.myMode,
        locale: event.locale,
      })

      const isHost = event.myMode === 'host'

      enqueue.assign({
        me: new Player(isHost ? 'host' : 'guest', 'me', event.myName, ''),
        enemy: new Player(isHost ? 'guest' : 'host', 'enemy', event.enemyName, event.enemyId),
      })

      if (localStorage.getItem('rulesLetters')) {
        enqueue.assign({
          rulesLetters: true,
        })
      }
      if (localStorage.getItem('rulesCheck')) {
        enqueue.assign({
          rulesCheck: true,
        })
      }
      if (localStorage.getItem('rulesClear')) {
        enqueue.assign({
          rulesClear: true,
        })
      }
    }),

    addRTCListen() {
      RTClisten('WORD_VALIDATED', (message) => {
        useAssert(message.type === 'WORD_VALIDATED')

        send({
          type: 'Enemy validated my word',
          word: message.word,
        })
      })

      RTClisten('WORD_NOT_VALIDATED', (message) => {
        useAssert(message.type === 'WORD_NOT_VALIDATED')

        send({
          type: 'Enemy not validated my word',
          word: message.word,
        })
      })

      RTClisten('VALIDATION_REQUESTED', (message) => {
        useAssert(message.type === 'VALIDATION_REQUESTED')

        send({
          type: 'Enemy requested validation',
          word: message.word,
        })
      })

      RTClisten('READY', (message) => {
        useAssert(message.type === 'READY')

        send({ type: 'Enemy wants rematch' })
      })

      RTClisten('HOST_GENERATED_MAIN_WORD', (message) => {
        useAssert(message.type === 'HOST_GENERATED_MAIN_WORD')

        window.___e2e.mainWord = message.mainWord

        send({
          type: 'Host generated main word',
          mainWord: message.mainWord,
        })
      })
    },

    restoreContext: assign({
      myMode: 'not-set',
      locale: DEFAULT_LOCALE,

      me: undefined,
      enemy: undefined,

      mainWord: '',
      validationQueue: new Set(),
      winner: undefined,
    }),

    sleepMachineRTC() {
      machineRTC.send({
        type: 'Sleep',
      })
    },

    sendGameStoppedToMachineGraphics() {
      machineGraphics.send({
        type: 'Game stopped',
      })
    },

    resetRound: enqueueActions(({ enqueue }) => {
      enqueue.assign({
        mainWord: '',
        winner: undefined,
      })

      console.log('resetRound')
    }),

    resetPlayers: assign({
      me: ({ context }) => ({
        ...context.me,
        wantsRematch: false,
        currentWord: '',
        guessedWords: [],
        hp: 100,
        validationError: {
          word: '',
          reason: false,
        },
      }),
      enemy: ({ context }) => ({
        ...context.enemy,
        wantsRematch: false,
        currentWord: '',
        guessedWords: [],
        hp: 100,
        validationError: {
          word: '',
          reason: false,
        },
      }),
    }),

    sendGameStartedToMachineGraphics() {
      machineGraphics.send({
        type: 'Game started',
      })

      console.log('sendGameStartedToMachineGraphics', machineGraphics.snapshot.value.value)
    },

    assignMainWord: assign({
      mainWord: ({ event }) => {
        useAssert(event.type === 'Host generated main word')

        return event.mainWord
      },
    }),

    hostGeneratesMainWord: enqueueActions(({ context, enqueue }) => {
      if (context.myMode === 'host') {
        const randomIndex = ~~(Math.random() * machineDictionary.snapshot.value.context.dictionaries[context.locale].wordsForMainWordGenerationLength)

        const mainWord = machineDictionary.snapshot.value.context.dictionaries[context.locale].wordsForMainWordGeneration[randomIndex]

        enqueue.assign({
          mainWord,
        })

        window.___e2e.mainWord = mainWord

        RTCsend({
          type: 'HOST_GENERATED_MAIN_WORD',
          mainWord,
        })

        console.log('hostGeneratesMainWord', mainWord)
      }
    }),

    resetMyCurrentWord: assign({
      me: ({ context }) => ({
        ...context.me,
        currentWord: '',
      }),
    }),

    assignRulesClearTrue: assign({
      rulesClear: () => {
        localStorage.setItem('rulesClear', 'true')
        return true
      },
    }),

    unsetMyValidationError: assign({
      me: ({ context }) => ({
        ...context.me,
        validationError: {
          word: '',
          reason: false,
        },
      }),
    }),

    assignRulesCheckTrue: assign({
      rulesCheck: () => {
        localStorage.setItem('rulesCheck', 'true')
        return true
      },
    }),

    iAddLetterToMyWord: assign({
      me: ({ context, event }) => {
        useAssert(event.type === 'I typed a letter')
        const currentWord = context.me.currentWord + event.letter
        return {
          ...context.me,
          currentWord,
        }
      },
      rulesLetters: () => {
        localStorage.setItem('rulesLetters', 'true')
        return true
      },
    }),

    setMyValidationError: assign({
      me: ({ context, event }) => {
        useAssert(event.type === 'I not validated my word')
        return {
          ...context.me,
          validationError: {
            word: event.word,
            reason: event.errorReason,
          },
        }
      },
    }),

    iValidateMyWord({ event, context }) {
      useAssert(event.type === 'I submitted my word')

      const word = event.word

      if (snapshot.value.hasTag('main-word-will-be-refreshed-soon')) {
        send({
          type: 'I not validated my word',
          errorReason: 'word-will-be-refreshed-soon',
          word,
        })

        return
      }

      const errorReason = validateWord(word, context)

      if (errorReason) {
        send({
          type: 'I not validated my word',
          errorReason,
          word,
        })
      }

      else {
        send({
          type: 'I validated my word',
          word,
        })
      }
    },

    changeScores: enqueueActions(({ enqueue, event, context }) => {
      useAssert(event.type === 'I validated my word' || event.type === 'I validated enemy word' || event.type === 'Enemy validated my word')

      const word = event.word
      const damage = word.length * (DEBUG_GAME ? 20 : 3)

      const isMeSubmitted = event.type === 'I validated my word' || event.type === 'Enemy validated my word'

      const meClone = structuredClone(context.me)
      const enemyClone = structuredClone(context.enemy)

      const playerWhoGuessed = isMeSubmitted ? meClone : enemyClone
      const playerWhoGuessedEnemy = isMeSubmitted ? enemyClone : meClone

      document.querySelector('.damage-indicator-active')?.classList.remove('damage-indicator-active')

      setTimeout(() => {
        let indicator = '.damage-indicator-red'
        if (isMeSubmitted)
          indicator = '.damage-indicator-green'

        document.querySelector(indicator)?.classList.add('damage-indicator-active')
      }, 10)

      playerWhoGuessed.guessedWords.push(word)
      playerWhoGuessedEnemy.hp -= damage

      if (playerWhoGuessedEnemy.hp < 0)
        playerWhoGuessedEnemy.hp = 0

      enqueue.assign({
        me: meClone,
        enemy: enemyClone,
      })

      machineGraphics.send({
        type: 'Player guessed word',
        word,
        mode: playerWhoGuessed.mode,
      })
    }),

    checkIfRoundFinished: enqueueActions(({ context, enqueue }) => {
      if (context.me.hp <= 0 || context.enemy.hp <= 0) {
        const scores: Scores = JSON.parse(localStorage.getItem('scores')!)

        if (context.me.hp <= 0)
          scores[context.enemy.id][1]++
        else scores[context.enemy.id][0]++

        localStorage.setItem('scores', JSON.stringify(scores))

        const winner = context.me.hp <= 0 ? context.enemy : context.me

        enqueue.assign({
          winner,
          rounds: ({ context }) => context.rounds + 1,
        })

        machineGraphics.send({
          type: 'Player won',
          mode: winner.mode,
        })

        send({
          type: 'Round finished',
        })
      }
      else {
        send({
          type: 'Round continues',
        })
      }
    }),

    checkIfPlayersWantRematch({ context }) {
      if (context.me.wantsRematch && context.enemy.wantsRematch) {
        machineGraphics.send({ type: 'Round restarted' })
        send({ type: 'Round restarted' })
      }
    },

    assignMeWantRematchTrue: assign({
      me: ({ context }) => {
        RTCsend({
          type: 'READY',
        })

        return {
          ...context.me,
          wantsRematch: true,
        }
      },
    }),

    assignEnemyWantRematchTrue: assign({
      enemy: ({ context }) => {
        return {
          ...context.enemy,
          wantsRematch: true,
        }
      },
    }),

    clearValidationQueue: assign({
      validationQueue: new Set(),
    }),

    executeValidationQueue({ context }) {
      if (context.validationQueue.size > 0) {
        const words = Array.from(context.validationQueue.keys())

        RTCsend({
          type: 'VALIDATION_REQUESTED',
          word: words[0],
        })
      }
    },

    addWordToValidationQueue: assign({
      validationQueue: ({ context, event }) => {
        useAssert(event.type === 'I validated my word')
        const queueArray = Array.from(context.validationQueue.values())
        queueArray.push(event.word)
        return new Set(queueArray)
      },
    }),

    removeWordFromValidationQueue: assign({
      validationQueue: ({ context, event }) => {
        useAssert(event.type === 'Enemy not validated my word' || event.type === 'Enemy validated my word')
        const queueArray = Array.from(context.validationQueue.values())
        const wordIndex = queueArray.indexOf(event.word)
        queueArray.splice(wordIndex, 1)
        return new Set(queueArray)
      },
    }),

    iValidateEnemyWord({ context, event }) {
      useAssert(event.type === 'Enemy requested validation')

      const word = event.word

      const errorReason = validateWord(word, context)

      if (errorReason)
        send({ type: 'I not validated enemy word', word })

      else
        send({ type: 'I validated enemy word', word })
    },

    sendEnemyWordIsValidated({ event }) {
      useAssert(event.type === 'I validated enemy word')
      RTCsend({
        type: 'WORD_VALIDATED',
        word: event.word,
      })
    },
    sendEnemyWordNotValidated({ event }) {
      useAssert(event.type === 'I not validated enemy word')
      RTCsend({
        type: 'WORD_NOT_VALIDATED',
        word: event.word,
      })
    },

    botGeneratesPossibleWords({ context }) {
      const allWords = useFindPossibleWords(context.mainWord, machineDictionary.snapshot.value.context.dictionaries[context.locale].words)

      const fraction = ~~(allWords.length / 10)

      botWords = allWords.slice(fraction, fraction * 2)

      console.log('botGeneratesPossibleWords', botWords)
    },

    botGuessesWord({ context }) {
      clearTimeout(botTimeoutId)
      const timeout = ~~useRandomInRange(3000, 5000)

      botTimeoutId = setTimeout(() => {
        const word = botPicksWord(botWords, context)

        if (word) {
          send({
            type: 'I validated enemy word',
            word,
          })
        }

        send({
          type: 'Bot guessed word',
        })
      }, timeout)
    },
  },
  guards: {
    DEBUG_GAME: () => DEBUG_GAME,
    isHost: ({ context }) => context.myMode === 'host',
    isModeBot,
  },
  delays: {
    COUNTDOWN_TIMEOUT,
    VALIDATION_ERROR_TIMEOUT,
    MAIN_WORD_REFRESH_TIMEOUT,
    WORD_RESTRICTION_TIMEOUT: () => MAIN_WORD_REFRESH_TIMEOUT - 500,
  },
}).createMachine({
  /** @xstate-layout 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-lKqySq-GaqSagj1a5X86yA0T2DQdTlv0LDlA0BaXYzh8iamih0xFZBtxBLcLsS0Kk3Wnw9Sk7SAAhHWQFhAh3QEoyh6B2ANWwGiXoBky3EGEBAGI0b85OvUGawwRRrgbD0MmO4mFuGvC3JqK5Td83pULcM1Jpa+hUArVIsgi7ejkN6HQGWDB12D3kcPXyBrGYLy0HqQS5p64PBuIJNCvLLhJRLo8GJbxtCys9SWsty7K1rrLQMHqKJYBbtEGIAyNBdKp07abfImE8JCtibEi1m8qgmhNPqHhtwbg5GRe+-kTBYB1v7jZdiExxBYDcmwaEVLcUjCwFBxAwtdAaDtolPtFwNjai3KanwahlSJocG+mdkshltAI2dYjNGyOYEZf8yj4ggMkdo5gejCBhagM8LEx4vhEpvBipqAWtRWMnkM8fZGc7ROEZJRVRTUn36fz9BHZEgxqYqbhjhA8+QjgBMKMqVQ2pdgyXgihPC6YRK6ECFebW7b4DJDM6QMMYKoKnA4w7U4ZosIKW8PGQ0NxVAPLiPQBL89gGVwdvzPLQmfZ-CK0A364U4ExPNWUD2a4bVlaieaUGltHiamuLh-4goGqimhLCFgTNDXgvVCuDTTW1A1HVO0qocNLjXENLoLcxpRL9aeSCGrNDTZ2z1LDFUwMPb2yqJsGSFgzV4RyJqJNiVtttx0rI+iu2GaJeAYlQLoNTy1DUCYdcaEAs8vhsYXlUq7hPYvhjVRlk9tGsdpC47QNVRnb8w7MoYrLQ+CBoJI0FxocjNh947G0dxMVVIFVbxukEfgouNuAGJ20e-armUHlOOjx+HyOUInzySdHUKmZPuVmLpXUF7VekEAaB092a8PU8E-twRcGaUrVQbaKhx4cUuwtTPuuSfOnKAusYnWJbHSndlKU09ugCeqpNmrfK6j1PqgxZf8QuHhJw3hwpJstCE5DShGsHldhaeCJm83EVnQbnb6M8qk+0qq4p9vacfeK79FQtRhLPCOOhD3MVQE+GCjhU0BpEaR+E4857l9O4327jFuetX848JeHkG4uO1xHgx1UCSP3WvjqBmuCPJ8o8iarx3Z+jk69EpjgPf+Sc-QpzdzG6JrezRng7+OtnqZLQSWuPE9CEk+c5XHwQ++j9hSn-r6CtPTf8gyS4wYEoZ4AfsNHYaR4GxNQqlPEfp89iJFSIyLyyuLyI0ITYLx3ari7D3bGBuB2xoQlArj1y8p2p75FC-5UT-6OJAHvggHuKeKBjeJL5N455QEGjorFzJoRIxJpi3CKQsLuC86VYtwfp-7iLYHOLAFHSgGKLKK4C4x9BEGp6N7rAGDOzFxqAgyCQ4RbjUGYQKT0FuCMHizME2KG6x4+ojDEEHbFx5AQ6gybDGCLb1LKQZq7ybC9oxKCbl5VZypG69CaGEpTKfKzKO7zK-JgDaFKBOp6FBaCR2yoQiqbB5BGhFC9Kq73B64FrR7PYKoOGvLKpeHZDuBCQwxFAqiaZGjCpVBtJCT1ybDJqaj3BD5xaj7+xxGOHT4U6TzkpVQsriLhpgEnru5AyOBpHKi3APBZFST7jiq5a8qiQ8IYE5LeoJG+o4z+pJ5BqybBhJHjorgOB74lwbBngB7ZDrh6i3CuBmqRRaAvDDHrrfpSJJEtJCQo6nas4dKISwQ1CIrWrGYlH65lEiKHErpVoPz5KWYbqNrNp9CtrtonEGiODnEs7nbRglAyQlCgy6ApoPBcwHFfpvG-p9CbrboYInF0EZowQA5f7HjDpHAaDoSGDST3CWgIlLpIl7pkrDCjBAapCgbgaL7CH7ZKA4TOw8LFwGjGCA5q7gkElQnElwykmH6qHmb4ZfHnQ2ZYBJG6BqAhEnbjr5BJrsKBZcIOC8KxKPYRZAA */
  /** @xstate-layout  */
  id: 'MachineGame',

  context: {
    myMode: 'not-set',
    locale: DEFAULT_LOCALE,

    // @ts-expect-error undefined
    me: undefined,
    // @ts-expect-error undefined
    enemy: undefined,

    mainWord: '',
    validationQueue: new Set(),
    winner: undefined,

    rulesLetters: false,
    rulesCheck: false,
    rulesClear: false,

    rounds: 0,
  },

  states: {
    Sleep: {
      on: {
        Awake: {
          target: 'Awake',
          actions: ['initContext', 'addRTCListen'],
        },
      },
    },

    Awake: {
      tags: 'awake',
      on: {
        'Sleep': {
          target: 'Sleep',
          actions: ['restoreContext', 'sleepMachineRTC', 'sendGameStoppedToMachineGraphics'],
        },

        'Host generated main word': {
          target: 'Awake',
          actions: 'assignMainWord',
        },
      },

      entry: ['resetRound', 'resetPlayers', 'sendGameStartedToMachineGraphics'],

      states: {
        'Showing countdown': {
          tags: 'showing-countdown',
          entry: 'hostGeneratesMainWord',

          after: {
            COUNTDOWN_TIMEOUT: {
              target: 'Playing',
              reenter: true,
            },
          },
        },

        'Playing': {
          tags: 'playing',
          type: 'parallel',
          entry: ['resetMyCurrentWord', 'unsetMyValidationError'],

          states: {
            'My word typing': {
              on: {
                'I typed a letter': {
                  target: 'My word typing',
                  actions: ['iAddLetterToMyWord', 'unsetMyValidationError'],
                },

                'I cleared my word': {
                  target: 'My word typing',
                  actions: ['resetMyCurrentWord', 'assignRulesClearTrue'],
                },
              },
            },

            'My word submitting': {
              states: {
                'Waiting for me to submit word': {
                  states: {
                    'Idle': {},

                    'Showing my validation error': {
                      tags: 'validation-error',

                      after: {
                        VALIDATION_ERROR_TIMEOUT: {
                          target: 'Idle',
                          actions: 'unsetMyValidationError',
                        },
                      },

                      entry: 'setMyValidationError',
                    },
                  },

                  initial: 'Idle',

                  on: {
                    'I submitted my word': {
                      target: 'I\'m validating my word',
                      actions: 'assignRulesCheckTrue',
                    },
                  },
                },

                'I\'m validating my word': {
                  entry: ['unsetMyValidationError', 'resetMyCurrentWord', 'iValidateMyWord'],

                  on: {
                    'I validated my word': 'Waiting for me to submit word',
                    'I not validated my word': 'Waiting for me to submit word.Showing my validation error',
                  },
                },
              },

              initial: 'Waiting for me to submit word',
            },

            'Managing scores': {
              states: {
                'Waiting for guessed words': {
                  on: {
                    'I validated my word': 'Changing scores',
                    'I validated enemy word': 'Changing scores',
                  },
                },

                'Changing scores': {
                  entry: ['changeScores', 'checkIfRoundFinished'],

                  on: {
                    'Round continues': 'Waiting for guessed words',
                    'Round finished': '#MachineGame.Awake.Asking for rematch',
                  },
                },
              },

              initial: 'Waiting for guessed words',
            },

            'Restricting word submission': {
              states: {
                'Can submit': {
                  after: {
                    WORD_RESTRICTION_TIMEOUT: 'Can\'t submit',
                  },
                },

                'Can\'t submit': {
                  tags: 'main-word-will-be-refreshed-soon',
                },
              },

              initial: 'Can submit',
            },

            'My anticheat': {
              entry: 'clearValidationQueue',

              states: {
                'Executing validation queue': {
                  entry: 'executeValidationQueue',

                  on: {
                    'I validated my word': {
                      target: 'Executing validation queue',
                      reenter: true,
                      actions: 'addWordToValidationQueue',
                    },

                    'Enemy not validated my word': {
                      target: 'Executing validation queue',
                      reenter: true,
                      actions: 'removeWordFromValidationQueue',
                    },

                    'Enemy validated my word': {
                      target: 'Executing validation queue',
                      reenter: true,
                      actions: 'removeWordFromValidationQueue',
                    },
                  },
                },
              },

              initial: 'Executing validation queue',
            },

            'Enemy anticheat': {
              states: {
                'Waiting for enemy to request validation': {
                  on: {
                    'Enemy requested validation': 'I\'m validating enemy word',
                  },
                },

                'I\'m validating enemy word': {
                  entry: 'iValidateEnemyWord',

                  on: {
                    'I validated enemy word': {
                      target: 'Waiting for enemy to request validation',
                      actions: 'sendEnemyWordIsValidated',
                    },

                    'I not validated enemy word': {
                      target: 'Waiting for enemy to request validation',
                      actions: 'sendEnemyWordNotValidated',
                    },
                  },
                },
              },

              initial: 'Waiting for enemy to request validation',
            },

            'Bot logic': {
              states: {
                'Checking if bot mode': {
                  always: {
                    target: 'Bot generates possible words',
                    guard: 'isModeBot',
                    reenter: true,
                  },
                },

                'Bot is playing': {
                  entry: 'botGuessesWord',

                  on: {
                    'Bot guessed word': {
                      target: 'Bot is playing',
                      reenter: true,
                    },
                  },
                },

                'Bot generates possible words': {
                  always: 'Bot is playing',
                  entry: ['botGeneratesPossibleWords', 'assignEnemyWantRematchTrue'],
                },
              },

              initial: 'Checking if bot mode',
            },
          },

          after: {
            MAIN_WORD_REFRESH_TIMEOUT: {
              target: 'Playing',
              reenter: true,
              actions: 'hostGeneratesMainWord',
              guard: 'isHost',
            },
          },

          on: {
            'Host generated main word': {
              target: 'Playing',
              reenter: true,
              actions: 'assignMainWord',
            },
          },
        },

        'Asking for rematch': {
          tags: 'rematch',

          on: {
            'I want rematch': {
              target: 'Asking for rematch',
              reenter: true,
              actions: 'assignMeWantRematchTrue',
            },

            'Enemy wants rematch': {
              target: 'Asking for rematch',
              reenter: true,
              actions: 'assignEnemyWantRematchTrue',
            },

            'Round restarted': {
              target: '#MachineGame.Awake',
              reenter: true,
            },
          },

          entry: 'checkIfPlayersWantRematch',
        },
      },

      initial: 'Showing countdown',
    },
  },

  initial: 'Sleep',
})

function validateWord(word: string, context: MachineGameContext): WordValidationErrorReason {
  useAssert(typeof context.me !== 'undefined' && typeof context.enemy !== 'undefined')

  let errorReason: WordValidationErrorReason = false

  if (word.length < 3)
    errorReason = 'too-short'

  else if (context.me.guessedWords.includes(word) || context.enemy.guessedWords.includes(word))
    errorReason = 'already-guessed'

  else if (context.mainWord.includes(word))
    errorReason = 'in-a-row'

  else if (!(machineDictionary.snapshot.value.context.dictionaries[context.locale as Locale].words.includes(word)))
    errorReason = 'not-present'

  for (const letter of word) {
    if (!(context.mainWord.includes(letter))) {
      errorReason = 'not-part'
      break
    }
  }

  return errorReason
}

function isModeBot() {
  const mode = new URL(document.location.href).searchParams.get('mode')
  return mode === 'bot'
}

let botTriesCount = 0
function botPicksWord(words: string[], context: MachineGameContext): string {
  const word = words[~~useRandomInRange(0, words.length - 1)]

  const errorReason = validateWord(word, context)

  if (botTriesCount < 5) {
    if (errorReason) {
      botTriesCount++
      return botPicksWord(words, context)
    }

    else {
      botTriesCount = 0
      return word
    }
  }
  else {
    return ''
  }
}

const snapshot = shallowRef(getInitialSnapshot(MachineGame))

const actorRef = createActor(MachineGame, DEBUG_INSPECTOR
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

const machineGame = {
  snapshot,
  send,
}

export {
  machineGame,
  Player,
  MAIN_WORD_REFRESH_TIMEOUT,
}
