<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import FormButton from '../FormButton/FormButton.vue'
import messages from './messages.json'

defineProps<{
  isMe: boolean
  isMeReady: boolean
  isEnemyReady: boolean
  connected: boolean
}>()

defineEmits<{
  (e: 'iAmReady'): void
}>()

const { t } = useI18n({ messages, useScope: 'global' })
</script>

<template>
  <div>
    <template v-if="isMe">
      <template v-if="connected">
        <span v-if="isMeReady">{{ t('waiting-enemy') }}</span>
        <FormButton
          v-else
          data-test="i-am-ready"
          @click="$emit('iAmReady')"
        >
          {{ t('i-ready') }}
        </FormButton>
      </template>
      <template v-else>
        <!-- {{ t('waiting-somebody') }} -->
      </template>
    </template>
    <template v-else>
      <template v-if="connected">
        <span v-if="isEnemyReady">{{ t('enemy-ready') }}</span>
        <span v-else>{{ t('enemy-not-ready') }}</span>
      </template>
      <template v-else>
        {{ t('waiting-somebody') }}
      </template>
    </template>
  </div>
</template>
