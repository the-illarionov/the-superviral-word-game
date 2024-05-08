<script setup lang='ts'>
import { RouterLink } from 'vue-router'
import LayoutCenter from '../LayoutCenter/LayoutCenter.vue'
import AudioButton from '../AudioButton/AudioButton.vue'
</script>

<template>
  <LayoutCenter
    class="fixed
        top-0
        left-0
        p-2
        z-20"
  >
    <RouterLink
      class="mr-1"
      data-test="link-home"
      :to="{
        name: 'PageIndex',
      }"
    >
      <img
        src="/img/ui/home.png"
        class="w-[25px]"
      >
    </RouterLink>
    <AudioButton />
  </LayoutCenter>
</template>
