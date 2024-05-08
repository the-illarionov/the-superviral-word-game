interface Window {
  ___e2e: {
    isPlaywright?: boolean
    iceCandidates: RTCIceCandidate[]
    sessionId?: string
    locale?: Locale
    mainWord?: string
    dictionaries: {
      en: string[]
    }
    generateUrljoinGame?: any
    messages: any
  }
}

//
//
// WEBSOCKET
interface WebSocket {
  userData: {
    sessionId: string
  }
  accept: () => void
}

type WebSocketMessage =
    //
    //
    // BOTH GUEST AND HOST
  | {
    type: 'PLAYER_SENT_HANDSHAKE'
    sessionId?: string | null
    playerId?: string | null
    mode: PlayerModes
  }
  | {
    type: 'PLAYER_GENERATED_ICE_CANDIDATE'
    sessionId: string
    candidate: RTCIceCandidate | null
  }

    //
    //
    // SERVER
  | {
    type: 'SERVER_ANSWERED_HANDSHAKE'
    sessionId: string
    playerId: string
    iceServers: RTCIceServer[]
    enemySessionId: string | undefined
  }
  | {
    type: 'SERVER_CONFIRMED_GAME_EXISTS'
    offer: RTCSessionDescriptionInit | undefined
    iceCandidates: RTCIceCandidate[]
  }
  | {
    type: 'SERVER_DID_NOT_CONFIRM_GAME_EXISTS'
  }
  | {
    type: 'SERVER_ADDED_OFFER_TO_HOST'
  }
  | {
    type: 'SERVER_SENT_GUEST_REQUESTS_TO_JOIN'
    guestSessionId: string
  }
  | {
    type: 'SERVER_SENT_HOST_TO_GUEST'
    iceCandidates: RTCIceCandidate[]
    sdp: RTCSessionDescriptionInit
  }
  | {
    type: 'SERVER_SENT_GUEST_TO_HOST'
    iceCandidates: RTCIceCandidate[]
    sdp: RTCSessionDescriptionInit
  }
  | {
    type: 'SERVER_SENT_ENEMY_ICE_CANDIDATE'
    candidate: RTCIceCandidate | null
  }

    //
    //
    // HOST
  | {
    type: 'HOST_SENT_OFFER'
    sessionId: string
    offer: RTCSessionDescriptionInit
  } /* | {
    type: 'HOST_WAITS_FOR_GUEST'
    sessionId: string
  } */

    //
    //
    // GUEST
  | {
    type: 'GUEST_REQUESTS_TO_JOIN'
    hostSessionId: string
    guestSessionId: string
  }
  | {
    type: 'GUEST_CHECKS_IF_GAME_EXISTS'
    hostSessionId: string
    guestSessionId: string
  }
    /* | {
        type: 'GUEST_ASKS_HOST_INFO'
        sessionId: string
        hostSessionId: string
      } */
  | {
    type: 'GUEST_SENT_ANSWER'
    answer: RTCSessionDescriptionInit
    hostSessionId: string
    sessionId: string
  }

    //
    //
    // UTILS
  | {
    type: 'PING'
  }
  | {
    type: 'ERROR'
    errorType: ErrorTypes
  } | {
    type: 'CLOSE'
  }

type WebSocketMessageListener = {
  [messageKey in WebSocketMessage['type']]?: Function
}

type ErrorTypes =
  | 'SOCKET_ERROR'
  | 'INITIALIZATION_TIMEOUT'
  | 'PLAYER_NOT_FOUND_IN_DB'
  | 'PLAYERS_ARE_NOT_INITIALIZED'
  | 'ENEMY_DISCONNECTED'
  | 'YOU_DISCONNECTED'
  | 'INVALID_LOCALE'
  | 'INVALID_MODE'
  | 'I_AM_CHEATING'
  | 'ENEMY_IS_CHEATING'
  | 'ALREADY_BUSY'
  | 'UNSUPPORTED'
  | undefined

//
//
// DATA CHANNEL
type RTCMessage =
  | {
    type: 'READY'
  }
  | {
    type: 'INITIALIZED_DICTIONARY'
  }
  | {
    type: 'HOST_GENERATED_MAIN_WORD'
    mainWord: string
  }
  | {
    type: 'WORD_VALIDATED'
    word: string
  }
  | {
    type: 'WORD_NOT_VALIDATED'
    word: string
  }
  |
  {
    type: 'VALIDATION_REQUESTED'
    word: string
  } |
  {
    type: 'CHANGE_NAME'
    name: string
  } |
  {
    type: 'ID'
    id: string
  } |
  {
    type: 'INFO'
    name: string
    id: string
  } |
  {
    type: 'PING'
  } |
  {
    type: 'PONG'
  } | {
    type: 'CLOSE'
  }

type RTCMessageListener = {
  [messageKey in RTCMessage['type']]?: Function
}

//
//
// PLAYER
interface PlayerConnectionInfo {
  socket?: WebSocket
  sessionId: string
  candidates: RTCIceCandidate[]

  enemySessionId?: string
  sdp?: RTCSessionDescriptionInit
  last_visit: number
}

type PlayerModes = 'host' | 'guest' | 'not-set'

type PlayerTypes = 'me' | 'enemy'

//
//
// APPLICATION
type Locale = 'ru' | 'en' | 'ykt'

//
//
// WORDS
interface WordValidationError {
  word: string
  reason: WordValidationErrorReason
}

type WordValidationErrorReason = boolean | 'too-short' | 'already-guessed' | 'not-present' | 'in-a-row' | 'not-part' | 'word-will-be-refreshed-soon'
