<script setup lang='ts'>
import { machineAudio } from '@/machines/MachineAudio/MachineAudio'

function soundOn() {
  machineAudio.send({
    type: 'Sound on',
  })
}

function soundOff() {
  machineAudio.send({
    type: 'Sound off',
  })
}
</script>

<template>
  <span
    class="cursor-pointer"
    @click="machineAudio.snapshot.value.context.muted ? soundOn() : soundOff()"
  >
    <img
      v-show="machineAudio.snapshot.value.context.muted"
      src="/img/ui/audio-off.svg"
      class="w-[1.25rem]"
    >
    <img
      v-show="!machineAudio.snapshot.value.context.muted"
      src="/img/ui/audio-on.svg"
      class="w-[1.25rem]"
    >
  </span>
</template>
