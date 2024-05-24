import { onBeforeUnmount } from 'vue'
import { machineGame } from '@/machines/MachineGame/MachineGame'
import { machineApp } from '@/machines/MachineApp/MachineApp'
import { DEBUG_GAME, DEFAULT_LOCALE } from '@/composables/useConstants'

export function useCheckConditions() {
  return new Promise<void>((resolve, reject) => {
    if (DEBUG_GAME) {
      setTimeout(() => {
        machineGame.send({
          type: 'Awake',
          myMode: 'host',
          locale: 'ykt',
          myName: 'me',
          enemyName: 'enemy',
          enemyId: 'enemyId',
        })

        resolve()
      }, 300)

      onBeforeUnmount(() => {
        machineGame.send({
          type: 'Sleep',
        })
      })
    }
    else if (!machineApp.snapshot.value.hasTag('game-started')) {
      machineApp.send({
        type: 'Critical error occured',
        errorType: 'PLAYERS_ARE_NOT_INITIALIZED',
      })

      reject(new Error('PLAYERS_ARE_NOT_INITIALIZED'))
    }
    else { resolve() }
  })
}
