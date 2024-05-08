<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { computed } from 'vue'
import messages from '../messages.json'
import { machineGame } from '@/machines/MachineGame/MachineGame'
import LayoutCenter from '@/components/LayoutCenter/LayoutCenter.vue'
import LiquidBg from '@/components/LiquidBg/LiquidBg.vue'

const { t } = useI18n({ messages, useScope: 'global' })

const BASE_URL = import.meta.env.BASE_URL

const currentWord = computed(() => machineGame.snapshot.value.context.me.currentWord)

const validationErrorReason = computed(() => machineGame.snapshot.value.context.me?.validationError.reason)
</script>

<template>
  <div
    class="flex
        justify-center
        flex-wrap
        pb-8
        relative
        w-full"
    data-test="current-word"
  >
    <LayoutCenter>
      <div
        v-show="currentWord.length > 0"
        class="px-4
            relative
            text-black
            text-shadow-none
            text-xl"
        data-test="current-word"
      >
        <LiquidBg :image="`${BASE_URL}img/ui/modal.png`">
          <span
            v-for="letter in currentWord"
            :key="`letter-${letter}`"
          >
            {{ letter }}
          </span>
        </LiquidBg>
      </div>
    </LayoutCenter>

    <LayoutCenter
      v-if="validationErrorReason"
      class="absolute
          bottom-[100%]
          left-0
          h-full
          text-center"
      :data-test="validationErrorReason"
    >
      <div
        class="animation-blink
            bg-red-900
            font-bold
            p-2
            text-3xl
            text-shadow-none
            text-white"
      >
        {{ t(validationErrorReason as string) }}
      </div>
    </LayoutCenter>
  </div>
</template>
