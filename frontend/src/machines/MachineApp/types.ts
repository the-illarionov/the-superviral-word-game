import type { Composer } from 'vue-i18n'
import type { Router } from 'vue-router'

export type EventInitialize = {
  type: 'Awake'
  i18n: Composer
  router: Router
}

export type MachineAppEvent =
  EventInitialize |
  {
    type: 'Sleep'
  } |
  {
    type: 'User went to lobby'
  } |
  {
    type: 'User went to menu'
  } |
  {
    type: 'User changed locale'
    locale: Locale
  } |
  {
    type: 'Critical error occured'
    errorType: ErrorTypes
  } |
  {
    type: 'Error was closed'
  } |
  {
    type: 'Document becomes visible'
  } |
  {
    type: 'Game started'
    myMode: PlayerModes
    myName: string
    enemyName: string
    enemyId: string
  }
