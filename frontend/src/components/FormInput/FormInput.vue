<script setup lang="ts">
import LiquidBg from '../LiquidBg/LiquidBg.vue'

defineOptions({
  inheritAttrs: false,
})

withDefaults(defineProps<{
  modelValue: string
  wrapperClasses?: string[]
}>(), {
  wrapperClasses: () => [],
})

const model = defineModel()

const BASE_URL = import.meta.env.BASE_URL
</script>

<template>
  <div
    :class="[
      $style.wrapper,
      ...wrapperClasses,
    ]"
  >
    <LiquidBg :image="`${BASE_URL}img/ui/modal.png`">
      <input
        v-bind="$attrs"
        v-model="model"
        :class="$style.input"
      >
    </LiquidBg>
  </div>
</template>

<style module>
.wrapper {
  position: relative;
  width: 100%;
}

.input {
  display: block;

  width: 100%;
  padding: 0.25rem 1rem;

  @apply text-black;

  text-align: inherit;
  text-transform: uppercase;

  background: none;
  border: none;
  outline: none;

  &::placeholder {
    @apply text-gray-500;
  }
}
</style>
