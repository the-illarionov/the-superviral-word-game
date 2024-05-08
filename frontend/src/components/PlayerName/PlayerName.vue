<script setup lang='ts'>
import { useI18n } from 'vue-i18n'

defineProps<{
  isMe: boolean
}>()

const { t } = useI18n({ useScope: 'global' })
</script>

<template>
  <div
    class="flex
        justify-center"
  >
    <div :class="$style.name">
      <slot />
    </div>
    <div class="ml-1">
      {{ t(isMe ? 'me' : 'enemy') }}
    </div>
  </div>
</template>

<style module lang='postcss'>
.name {
  overflow: hidden;

  max-width: 20vw;
  padding-left: 4px;

  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
