<script setup lang='ts'>
import { useI18n } from 'vue-i18n'
import messages from '../messages.json'
import LiquidBg from '@/components/LiquidBg/LiquidBg.vue'
import ReadyButton from '@/components/ReadyButton/ReadyButton.vue'
import { machineGame } from '@/machines/MachineGame/MachineGame'
import FormButton from '@/components/FormButton/FormButton.vue'

const { t } = useI18n({ messages, useScope: 'global' })

const BASE_URL = import.meta.env.BASE_URL

function sendIWantRematch() {
  machineGame.send({ type: 'I want rematch' })
}
</script>

<template>
  <div
    :class="$style.rematch"
    data-test="rematch"
  >
    <LiquidBg :image="`${BASE_URL}img/ui/modal.png`">
      <div
        class="flex
            items-center"
      >
        <div
          class="px-2
              text-2xl"
        >
          <div
            v-if="machineGame.snapshot.value.context.winner!.type === 'me'"
            data-test="you-win"
            class="text-green-900"
          >
            {{ t('you-win') }}
          </div>
          <div
            v-else
            data-test="you-lose"
            class="text-red-900"
          >
            {{ t('you-lose') }}
          </div>
        </div>
        <div>
          <p>
            {{ t('rematch') }}
          </p>
          <div>
            <ReadyButton
              :is-me="machineGame.snapshot.value.context.myMode === 'host'"
              :is-me-ready="machineGame.snapshot.value.context.me.wantsRematch"
              :is-enemy-ready="machineGame.snapshot.value.context.enemy.wantsRematch"
              :connected="true"
              data-test="host-wants-rematch"
              @i-am-ready="sendIWantRematch"
            />
            <ReadyButton
              :is-me="machineGame.snapshot.value.context.myMode === 'guest'"
              :is-me-ready="machineGame.snapshot.value.context.me.wantsRematch"
              :is-enemy-ready="machineGame.snapshot.value.context.enemy.wantsRematch"
              :connected="true"
              data-test="guest-wants-rematch"
              @i-am-ready="sendIWantRematch"
            />
          </div>
        </div>
      </div>
      <div class="my-2">
        <FormButton @click="$router.push({ name: 'PageIndex' })">
          {{ t('go-to-menu') }}
        </FormButton>
      </div>
    </LiquidBg>
  </div>
</template>

<style module lang='postcss'>
.rematch {
  position: absolute;
  top: 80px;
  left: 50%;
  translate: -50%;

  padding: 0.5rem;

  font-weight: bold;
  text-align: center;
  text-shadow: none;

  @apply text-black;
}
</style>
