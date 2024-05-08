<script setup lang="ts">
import { RouterView, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { useHead } from '@unhead/vue'
import { ASPECT_RATIO } from './composables/useConstants'
import LayoutCenter from './components/LayoutCenter/LayoutCenter.vue'
import ModalComponent from './components/ModalComponent/ModalComponent.vue'
import FormButton from './components/FormButton/FormButton.vue'
import { machineLobby } from './machines/MachineLobby/MachineLobby'
import NavigationButtons from './components/NavigationButtons/NavigationButtons.vue'
import { generateUrljoinGame } from './composables/useUrlGenerator'
import { machineApp } from '@/machines/MachineApp/MachineApp'
import messages from '@/messages.json'

function onModalClose() {
  machineApp.send({ type: 'Error was closed' })
}

const i18n = useI18n({ messages, useScope: 'global' })
const router = useRouter()
machineApp.send({
  type: 'Awake',
  // @ts-expect-error i18n
  i18n,
  router,
})

const BASE_URL = import.meta.env.BASE_URL

const isLoading = computed(() => machineLobby.snapshot.value.hasTag('loading'))
const isWaitingForHost = computed(() => machineLobby.snapshot.value.hasTag('waiting-for-host'))

onMounted(() => {
  window.___e2e.generateUrljoinGame = generateUrljoinGame
})

onBeforeUnmount(() => {
  machineApp.send({
    type: 'Sleep',
  })
})

const useHeadTitle = computed(() => i18n.t('title'))

useHead({
  title: useHeadTitle,
  meta: [
    {
      name: 'description',
      content: i18n.t('description'),
    },
    {
      name: 'og:title',
      content: i18n.t('og:title'),
    },
    {
      name: 'og:description',
      content: i18n.t('og:description'),
    },
    {
      name: 'og:type',
      content: 'website',
    },
    {
      name: 'og:locale',
      content: import.meta.env.VITE_MODE === 'ykt' ? 'ru_ru' : 'en_us',
    },
    {
      name: 'og:image',
      content: import.meta.env.VITE_MODE === 'ykt' ? `${BASE_URL}img/og:image_ru.jpg` : `${BASE_URL}img/og:image_en.jpg`,
    },
  ],
})
</script>

<template>
  <div :class="$style.container">
    <div :class="$style['page-wrapper']">
      <RouterView v-slot="{ Component }">
        <Suspense>
          <component :is="Component" />
        </Suspense>
      </RouterView>
    </div>
  </div>

  <!-- GAME ASSETS STUFF -->
  <canvas
    id="graphics"
    :class="$style.graphics"
  />
  <audio
    id="audio-waiting"
    :src="`${BASE_URL}audio/waiting.mp3`"
    loop
    hidden
    preload="auto"
  />

  <!-- LAYOUT STUFF -->
  <NavigationButtons v-show="$route.name !== 'PageIndex'" />

  <LayoutCenter
    class="fixed
        bottom-0
        left-0
        z-20"
    v-html="i18n.t('promo')"
  />

  <!-- POPUPS -->
  <LayoutCenter :class="$style.portrait">
    {{ i18n.t('portrait') }}
  </LayoutCenter>

  <ModalComponent

    :disable-close="true"
    :watcher="isLoading || isWaitingForHost"
  >
    <span
      v-if="isLoading"
      data-test="loading"
    >
      {{ i18n.t('loading') }}
    </span>
    <span
      v-else-if="isWaitingForHost"
      data-test="waiting-for-host"
    >
      {{ i18n.t('waiting-for-host') }}
    </span>

    <NavigationButtons class="!fixed" />
  </ModalComponent>

  <ModalComponent
    v-slot="{
      close,
    }"
    :disable-close="machineApp.snapshot.value.context.error === 'UNSUPPORTED'"
    :data-test="machineApp.snapshot.value.context.error"
    :watcher="machineApp.snapshot.value.hasTag('show-critical-error')"
    @close="onModalClose"
  >
    <p class="text-red-900">
      {{ i18n.t('error') }}
    </p>
    <div>
      <template v-if="machineApp.snapshot.value.context.error">
        {{ i18n.t(machineApp.snapshot.value.context.error) }}
      </template>
    </div>
    <FormButton
      v-show="machineApp.snapshot.value.context.error !== 'UNSUPPORTED'"
      data-test="modal-close"
      class="mt-4"
      @click="close(); onModalClose()"
    >
      {{ i18n.t('go-to-menu') }}
    </FormButton>
  </ModalComponent>

  <div :class="$style['mobile-helper']" />
</template>

<style module lang="postcss">
.container {
  position: relative;
  z-index: 10;

  max-width: calc(100vh * v-bind(ASPECT_RATIO));
  height: 100vh;
  margin: 0 auto;
}

.portrait {
  position: fixed;
  z-index: 1000;
  top: 0;
  left: 0;

  display: none;

  width: 100%;
  height: 100%;
  padding: 1rem;

  color: #000;
  text-align: center;
  text-shadow: none;

  background: #fff;

  @apply bg-white text-black;

  @media (orientation: portrait) {
    display: flex;
  }
}

.graphics {
  position: fixed;
  z-index: 0;
  top: 0;
  left: 50%;
  transform: translateX(-50%);

  max-width: calc(100vh * v-bind(ASPECT_RATIO));
  height: 100%;

  image-rendering: pixelated;
}

.page-wrapper {
  position: relative;
  z-index: 10;
  padding-bottom: 40px;
}

.mobile-helper {
  position: absolute;
  top: 0;
  left: 0;

  display: none;

  width: 10px;
  height: 101vh;

  @media (width <= 1024px) {
    display: block;
  }
}
</style>
