<script setup lang="ts">
defineProps<{
  image: string
}>()
</script>

<template>
  <div
    :style="{
      '--url': `url(${image})`,
    }"
  >
    <span
      :class="[
        $style.bg,
        $style.tl,
      ]"
    />
    <span
      :class="[
        $style.bg,
        $style.tr,
      ]"
    />
    <span
      :class="[
        $style.bg,
        $style.bl,
      ]"
    />
    <span
      :class="[
        $style.bg,
        $style.br,
      ]"
    />
    <div :class="$style.content">
      <slot />
    </div>
  </div>
</template>

<style module lang='postcss'>
.bg {
  position: absolute;
  z-index: 0;

  box-sizing: content-box;
  width: 50%;
  height: 50%;
  padding: 1px;

  background-image: var(--url);
  background-repeat: no-repeat;
}

.tl {
  top: 0;
  left: 0;
  background-position: 0 0;
}

.tr {
  top: 0;
  right: 0;
  background-position: 100% 0;
}

.bl {
  bottom: 0;
  left: 0;
  background-position: 0 100%;
}

.br {
  right: 0;
  bottom: 0;
  background-position: 100% 100%;
}

.content {
  position: relative;
  z-index: 10;
}
</style>
