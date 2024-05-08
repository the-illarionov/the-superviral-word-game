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
  },
  guards: {
    DEBUG_GAME: () => DEBUG_GAME,
    isHost: ({ context }) => context.myMode === 'host',
  },
  delays: {
    COUNTDOWN_TIMEOUT,
    VALIDATION_ERROR_TIMEOUT,
    MAIN_WORD_REFRESH_TIMEOUT,
    WORD_RESTRICTION_TIMEOUT: () => MAIN_WORD_REFRESH_TIMEOUT - 500,
  },
}).createMachine({
  /** @xstate-layout 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-DGGcC61J2lhW9A9WKnG+MfVq1KiG1yv4-mlv1hW2lYbGYLxTBoC0uxnD5E1NFA5nKyDbmqW4XYloVJI2SYI+8TBYDsEfhVdiExxBYDcmwaEmq51YH1fnYWugNB20SoYIo6FnDai3NGnwahlRtocNoHNkRJ3TpXSMBd+al3iFgPe+dmB10aIzL21pDwfA4XCg0h2sMYGuBVHAiSKpj7IzHfyCdU7+42VnQ+zAxDSF+gjsiQY1NP2IDhjhA8+QjiVMKMqVQ2pdgyXgihPC6YRK6ECFebWEA4CyBg6QMMoKoKnA2NqU4ZosIKWMJaLQRgdDixHafO0cR6CcfnoAw9Dt+ZN0k+lWDYA5MAN+uFThrTY1lA9muJNSnmnmkXuucKJRoOjpsf8QUDVRTQlhCwJm4awXqiLnpm2BmajMu1HDS41xDS6C3MaUS17rkgk07Q02ds9SwxVMDD29sqibBkrRk125hZibthFtuOk3H0SiwzLjgDEpUdBqeWoagTDrjQpR418NjAmsdXcPLF8Ma+MstFiNjtfAA0S6qZL5GHZlFtZaE1sDEroRU8RNTtnIvozyiU7GD9EMVVIFVEpuketgouNuAbQMhuVcrmUY1KhWmtIdeuWbJ95s9MW7LTrK2TqStjhtuy8rtu3XpBAGgu31mvD1PBKrcEXBmkU1Ubz2wJuHBtmXazUmFv5blu+F7Zk+5So+1to6fRboAnqqTb+qquo9T6oMAH9Kjg728OFdtlpambyqMqLYNdrgXdqGZ9rOLlu4+xt6mZROdslfk79FQtRhLPGp+Yo4MUGE+GCjhU0BpEZzclg9lHHd8GOXEZTg1ORHBibNGeNcR4RtVDGy7XRQsXCoqvap9XVzNeiIIeIiVMcB7P1frpeAIutN0JaXkG4PhzQpTqw7KuB5Td12lxJbnNytfSJ7jgvBSffdz39+sfIMlj0GBKGeGrRjMKgxUEDPw8FVQSbVz7bFaSMmOOca4+WeSPF5zcwvHIK5ri7E1HAtwds0IlBXC00TLxrjmkR-dp3-t69ZKb2jo6rfcBFMDCUvXAe8Krh7zbYw-erXM5Z2mW4il9HuHKPH7Ss-G85Ob4vgpy-vG4Fxn0NffuYvRgMM7MTagQaCQhfvpQQ-BSE-NwM-KvO7R3WvHKEVQZMVdfWLMTPIFrUGTYYwfZZne4RwXQLmIzM8RKNcC-JbQtYZcVR5YlF5UlN5D5BOeAwAwSJA6jQSO2VCa1TYPIMBS0YPMfSfSAwVPNd1UVEg2g7IdwRldwZUW4B4I0AA7IZ4Qjc8VFO4E0e4QgqifNYgkZNbLHSeWVKqRVZ+f5EnNvRtelIGRwGGIoFUNpIoLcKSfcO1G4fQB4FwcxVQ0ZAQ2Akg4tFWUlctDVA6YQxuFcBwOuTQZSdtHwKSCSY1AoU5dtE8LQF4CLeDO9ZDd9YQ3QNQdgxLRufIdtIxKjUxBwCxNpRKRjfwIAA */
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
                    'I validated my word': {
                      target: 'Changing scores',
                      guard: 'DEBUG_GAME',
                    },

                    'I validated enemy word': 'Changing scores',
                    'Enemy validated my word': 'Changing scores',
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
