<script setup lang='ts'>
import { useI18n } from 'vue-i18n'
import messages from '../messages.json'
import { machineGame } from '@/machines/MachineGame/MachineGame'
import { machineApp } from '@/machines/MachineApp/MachineApp'

const { t } = useI18n({ messages, useScope: 'global' })

const isMobile = machineApp.snapshot.value.context.isMobile
</script>

<template>
  <div :class="$style.rules">
    <p :class="{ invisible: machineGame.snapshot.value.context.rulesLetters }">
      {{ t(isMobile ? 'rules-letters-mobile' : 'rules-letters-pc') }}
    </p>
    <p :class="{ invisible: machineGame.snapshot.value.context.rulesCheck }">
      {{ t(isMobile ? 'rules-check-mobile' : 'rules-check-pc') }}
    </p>
    <p :class="{ invisible: machineGame.snapshot.value.context.rulesClear }">
      {{ t(isMobile ? 'rules-clear-mobile' : 'rules-clear-pc') }}
    </p>
  </div>
</template>

<style module lang='postcss'>
.rules {
  position: absolute;
  top: 20%;
  left: 0;

  width: 100%;
  padding: 0 1rem;

  text-align: center;
}
</style>
