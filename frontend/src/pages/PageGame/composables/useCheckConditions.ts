import { onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { machineGame } from '@/machines/MachineGame/MachineGame'
import { machineApp } from '@/machines/MachineApp/MachineApp'
import { DEBUG_GAME } from '@/composables/useConstants'

export function useCheckConditions() {
  const { t, locale } = useI18n({ useScope: 'global' })

  return new Promise<void>((resolve, reject) => {
    const mode = new URL(document.location.href).searchParams.get('mode')

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
    else if (mode === 'bot') {
      machineGame.send({
        type: 'Awake',
        myMode: 'host',
        locale: locale.value as Locale,
        myName: localStorage.getItem('name') || '',
        enemyName: t('bot'),
        enemyId: 'enemyId',
      })

      resolve()
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
