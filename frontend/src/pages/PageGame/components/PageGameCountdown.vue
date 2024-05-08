<script setup lang='ts'>
import { useI18n } from 'vue-i18n'
import { onBeforeUnmount, onMounted, useCssModule } from 'vue'
import messages from '../messages.json'

const { t } = useI18n({ messages, useScope: 'global' })

let timeoutId: number

onMounted(() => {
  const body = document.querySelector('#app')

  const style = useCssModule()

  body!.classList.add(style['shake-that-body'])
  body!.classList.add('animation-shake')

  timeoutId = setTimeout(() => {
    body!.classList.remove(style['shake-that-body'])
    body!.classList.remove('animation-shake')
  }, 4000)
})

onBeforeUnmount(() => {
  clearTimeout(timeoutId)
})
</script>

<template>
  <div
    data-test="countdown"
    :class="$style.countdown"
  >
    <span :class="$style.letter">3</span>
    <span :class="$style.letter">2</span>
    <span :class="$style.letter">1</span>
    <span :class="$style.letter">{{ t('go') }}</span>
  </div>
</template>

<style module lang='postcss'>
.countdown {
  position: fixed;
  z-index: 100;
  top: 0;
  left: 0;

  overflow: hidden;

  width: 100%;
  height: 100%;

  background: rgb(0 0 0 / 50%);

  .letter {
    position: absolute;
    top: 50%;
    left: 50%;
    translate: -50% -50%;
    rotate: 0;
    scale: 1;

    font-size: 10rem;
    font-weight: bold;

    opacity: 0;

    animation-name: letter;
    animation-duration: 1s;
    animation-timing-function: linear;
    animation-fill-mode: forwards;

    &:nth-child(2) {
      animation-delay: 1s;
    }

    &:nth-child(3) {
      animation-delay: 2s;
    }

    &:nth-child(4) {
      animation-delay: 3s;
    }
  }
}

@keyframes letter {
  0% {
    rotate: 0;
    scale: 5;
    opacity: 0;
  }

  25% {
    rotate: 0;
  }

  30% {
    rotate: -10deg;
    scale: 1;
    opacity: 1;
  }

  35% {
    rotate: 10deg;
  }

  40% {
    rotate: -10deg;
  }

  45% {
    rotate: -10deg;
  }

  50% {
    rotate: 10deg;
  }

  60% {
    rotate: -5deg;
  }

  70% {
    rotate: 5deg;
  }

  80% {
    rotate: -5deg;
  }

  90% {
    rotate: 5deg;
  }

  100% {
    rotate: 0;
    opacity: 0;
  }
}

.shake-that-body {
  animation-delay: 3.3s;
}
</style>
