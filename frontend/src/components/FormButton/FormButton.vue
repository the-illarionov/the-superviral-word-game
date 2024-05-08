<script setup lang="ts">
import LiquidBg from '../LiquidBg/LiquidBg.vue'

withDefaults(defineProps<{
  tag?: string
}>(), {
  tag: 'button',
})

const BASE_URL = import.meta.env.BASE_URL
</script>

<template>
  <component
    :is="tag"
    :class="$style.button"
  >
    <LiquidBg :image="`${BASE_URL}img/ui/button.png`">
      <slot />
    </LiquidBg>
  </component>
</template>

<style module lang="postcss">
.button {
  cursor: pointer;

  position: relative;
  z-index: 1000;

  display: inline-block;

  padding: 0.25rem 0.75rem;

  text-shadow: inherit;
  text-transform: uppercase;

  outline: none;

  @apply text-white;

  &:active {
    transform: translate(2px, 2px);
  }
}
</style>
