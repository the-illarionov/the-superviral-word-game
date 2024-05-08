<script setup lang="ts">
const props = defineProps<{
  timeout: number
}>()

const timeoutSeconds = `${props.timeout / 1000}s`

const shakeTimeout = `${(props.timeout - 2000) / 1000}s`
</script>

<template>
  <div :class="$style.container">
    <div
      :class="[
        $style.progress,
      ]"
    />
  </div>
</template>

<style module lang="postcss">
@keyframes decreasing {
  0% {
    transform: translate3d(0, 0, 0);
  }

  100% {
    transform: translate3d(-100%, 0, 0);
  }
}

@keyframes shake {
  0% {
    rotate: 0;
  }

  10% {
    rotate: 1deg;
  }

  20% {
    rotate: -1deg;
  }

  30% {
    rotate: 1deg;
  }

  40% {
    rotate: -1deg;
  }

  50% {
    rotate: 1deg;
  }

  55% {
    rotate: -1deg;
  }

  60% {
    rotate: 1deg;
  }

  65% {
    rotate: -1deg;
  }

  70% {
    rotate: 1deg;
  }

  75% {
    rotate: -1deg;
  }

  80% {
    rotate: 1deg;
  }

  85% {
    rotate: -1deg;
  }

  90% {
    rotate: 1deg;
  }

  95% {
    rotate: -1deg;
  }

  100% {
    rotate: 0;
  }
}

.container {
  position: absolute;
  bottom: 100%;
  left: 25%;

  overflow: hidden;

  width: 50%;
  height: 10px;

  @apply bg-gray-500;

  animation-name: shake;
  animation-duration: 2s;
  animation-timing-function: linear;
  animation-delay: v-bind(shakeTimeout);
}

.progress {
  position: absolute;
  top: 0;
  left: 0;

  width: 100%;
  height: 100%;

  @apply bg-yellow-100;

  animation-name: decreasing;
  animation-duration: v-bind(timeoutSeconds);
  animation-timing-function: linear;
}
</style>
