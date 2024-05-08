<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import LiquidBg from '../LiquidBg/LiquidBg.vue'

const props = defineProps<{
  watcher: boolean
  disableClose?: boolean
}>()

const emit = defineEmits(['close'])

const dialog = ref<HTMLDialogElement>()

onMounted(() => {
  watch(() => props.watcher, (newValue) => {
    if (newValue)
      dialog.value!.showModal()

    else
      close()
  }, {
    immediate: true,
  })

  dialog.value!.onclose = () => {
    emit('close')
  }
})

function close() {
  dialog.value!.close()
}

function closeOnClick() {
  if (!props.disableClose)
    dialog.value!.close()
}

const BASE_URL = import.meta.env.BASE_URL
</script>

<template>
  <dialog
    ref="dialog"
    :class="$style.dialog"
    class="text-shadow-none"
    @click="closeOnClick"
  >
    <LiquidBg
      :image="`${BASE_URL}img/ui/modal.png`"
      @click.stop
    >
      <slot :close="close" />
    </LiquidBg>
  </dialog>
</template>

<style module lang="postcss">
.dialog {
  padding: 1rem;

  @apply text-black;

  background: none;
  border: none;
  outline: none;

  &::backdrop {
    background: rgb(0 0 0 / 50%);
  }
}
</style>
