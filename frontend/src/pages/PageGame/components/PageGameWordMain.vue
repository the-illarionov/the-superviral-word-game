<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'

import PageGameWordMainTimeout from './PageGameWordMainTimeout.vue'
import { MAIN_WORD_REFRESH_TIMEOUT, machineGame } from '@/machines/MachineGame/MachineGame'
import LayoutCenter from '@/components/LayoutCenter/LayoutCenter.vue'
import FormButton from '@/components/FormButton/FormButton.vue'

const refreshingTimeoutKey = ref(0)

const mainWord = computed(() => machineGame.snapshot.value.context.mainWord)
const myCurrentWord = computed(() => machineGame.snapshot.value.context.me.currentWord)

watch(
  mainWord,
  () => {
    refreshingTimeoutKey.value++
  },
)

function addLetterToPlayerCurrentWord(letter: string) {
  machineGame.send({
    type: 'I typed a letter',
    letter,
  })
}

function submit() {
  machineGame.send({
    type: 'I submitted my word',
    word: myCurrentWord.value,
  })
}

function clear() {
  machineGame.send({
    type: 'I cleared my word',
  })
}

onMounted(() => {
  document.onkeydown = (e) => {
    if (e.key === 'Backspace' || e.key === 'Escape' || e.key === 'Delete') {
      machineGame.send({
        type: 'I cleared my word',
      })
    }

    else if (e.key === 'Enter') {
      machineGame.send({
        type: 'I submitted my word',
        word: myCurrentWord.value,
      })
    }

    else if (e.key.length === 1) {
      machineGame.send({
        type: 'I typed a letter',
        letter: e.key,
      })
    }
  }
})
</script>

<template>
  <div
    class="flex
        items-end
        p-2
        relative"
  >
    <PageGameWordMainTimeout
      :key="refreshingTimeoutKey"
      :timeout="MAIN_WORD_REFRESH_TIMEOUT"
    />

    <FormButton
      data-test="current-word-clear"
      :class="$style.button"
      @pointerdown="clear"
    >
      <img
        src="/img/ui/cross.svg"
        class="inline
            w-1/2"
      >
    </FormButton>

    <LayoutCenter
      class="flex-1
          px-2"
    >
      <FormButton
        v-for="(letter, index) in mainWord"
        :key="`letter-${letter}-${index}`"
        :data-test="`main-word-letter-${letter}`"
        class="mr-[2px]
            mt-[2px]
            test-main-word-letter
            text-3xl"
        :class="$style.button"
        @pointerdown="addLetterToPlayerCurrentWord(letter)"
      >
        {{ letter }}
      </FormButton>
    </LayoutCenter>

    <FormButton
      data-test="current-word-submit"
      :class="$style.button"
      @pointerdown="submit"
    >
      <img
        src="/img/ui/checkmark.svg"
        class="inline
            w-2/3"
      >
    </FormButton>
  </div>
</template>

<style module lang="postcss">
.button {
  display: flex;
  align-items: center;
  justify-content: center;

  width: clamp(30px, 12vh, 70px);
  height: clamp(30px, 12vh, 70px);
  padding: 0;
}
</style>
