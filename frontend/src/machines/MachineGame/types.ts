import type { Player } from './MachineGame'

export type MachineGameEvent =
  {
    type: 'Awake'
    myMode: PlayerModes
    locale: Locale
    myName: string
    enemyName: string
    enemyId: string
  } |
  {
    type: 'Sleep'
  } |
  {
    type: 'Host generated main word'
    mainWord: string
  } |
    //
  //
  // MY WORD SUBMITTING
  {
    type: 'I typed a letter'
    letter: string
  } |
  {
    type: 'I cleared my word'
  } |
  {
    type: 'I submitted my word'
    word: string
  } | {
    type: 'I validated my word'
    word: string
  } | {
    type: 'I not validated my word'
    errorReason: WordValidationErrorReason
    word: string
  } |
  //
  //
  // MANAGING SCORES
  { type: 'Round continues' } |
  { type: 'Round finished' } |
  { type: 'I want rematch' } |
  { type: 'Enemy wants rematch' } |
  { type: 'Round restarted' } |

  //
  //
  // MY ANTICHEAT
  {
    type: 'Enemy validated my word'
    word: string
  } |
  {
    type: 'Enemy not validated my word'
    word: string
  } |

  //
  //
  // ENEMY ANTICHEAT
  {
    type: 'Enemy requested validation'
    word: string
  } |

  {
    type: 'I validated enemy word'
    word: string
  } | {
    type: 'I not validated enemy word'
    word: string
  }

export type MachineGameContext = {
  myMode: PlayerModes
  locale: Locale

  me: Player
  enemy: Player

  mainWord: string
  validationQueue: Set<string>
  winner: Player | undefined

  rulesLetters: boolean
  rulesCheck: boolean
  rulesClear: boolean

  rounds: number
}
