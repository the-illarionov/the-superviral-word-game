<script setup lang='ts'>
import { RouterLink } from 'vue-router'

import { useI18n } from 'vue-i18n'
import { useHead } from '@unhead/vue'
import messages from './messages.json'

import AudioButton from '@/components/AudioButton/AudioButton.vue'
import FormButton from '@/components/FormButton/FormButton.vue'

import { machineApp } from '@/machines/MachineApp/MachineApp'

import { AVAILABLE_LOCALES } from '@/composables/useConstants'

machineApp.send({ type: 'User went to menu' })

const { t, locale } = useI18n({ messages, useScope: 'global' })

function changeLocale(e: Event) {
  const newLocale = (e.target as HTMLSelectElement).value as Locale
  locale.value = newLocale
  localStorage.setItem('locale', newLocale)

  machineApp.send({
    type: 'User changed locale',
    locale: newLocale,
  })
}

const BASE_URL = import.meta.env.BASE_URL

const logoSrc = BASE_URL + (import.meta.env.VITE_MODE === 'ykt' ? 'img/logo_ru.png' : 'img/logo_en.png')

useHead({
  meta: [
    {
      name: 'og:url',
      content: import.meta.env.VITE_MODE === 'ykt' ? 'https://illarionov.school/mas-wrestling/' : 'https://the-superviral-word-game.com/',
    },
  ],
})
</script>

<template>
  <div
    class="pt-20
        px-4
        text-center"
  >
    <div class="mb-4">
      <img
        :src="logoSrc"
        class="min-w-[150px]
            mx-auto
            w-[20vh]"
      >
    </div>
    <p
      class="mb-2"
      v-html="t('about')"
    />
    <div class="mb-2">
      <FormButton>
        <RouterLink
          data-test="link-to-lobby"
          :to="{
            name: 'PageLobby',
            query: {
              m: 'h',
            },
          }"
          class="no-underline"
        >
          {{ t('start') }}
        </RouterLink>
      </FormButton>
    </div>

    <div class="mb-2">
      <FormButton>
        <RouterLink
          data-test="game-bot"
          :to="{
            name: 'PageGame',
            query: {
              mode: 'bot',
            },
          }"
          class="no-underline"
        >
          {{ t('game-bot') }}
        </RouterLink>
      </FormButton>
    </div>

    <div
      class="flex
          justify-center
          items-center
          mb-2"
    >
      <div class="mr-2">
        {{ t('sound') }}
      </div>
      <AudioButton />
    </div>

    <FormButton class="mb-4">
      <RouterLink
        data-test="link-to-scores"
        :to="{
          name: 'PageScores',
        }"
        class="no-underline"
      >
        {{ t('scores-menu') }}
      </RouterLink>
    </FormButton>

    <template v-if="AVAILABLE_LOCALES.length > 1">
      <div
        class="flex
            justify-center
            items-center
            mb-4"
      >
        {{ t('language') }}:

        <FormButton
          v-for="_locale in AVAILABLE_LOCALES"
          :key="`locale-${_locale}`"
          tag="label"
          class="!p-2
              min-w-[30px]
              ml-2"
        >
          <input
            type="radio"
            :value="_locale"
            name="locale"
            :checked="_locale === locale"
            :class="$style.radio"
            @change="changeLocale"
          >

          <img
            :src="`${BASE_URL}img/ui/flag-${_locale}.png`"
            class="w-[2rem]"
          >
        </FormButton>
      </div>
      <div v-html="t('thanks')" />
    </template>
  </div>
</template>

<style module lang="postcss">
@media only screen and (height <= 500px) {
  .padding {
    padding-top: 0.5rem;
    padding-bottom: 1.5rem;
  }
}

.radio {
  position: absolute;
  left: -9999px;
  visibility: hidden;

  + img {
    filter: grayscale(0.7) brightness(0.3);
  }

  &:checked + img {
    filter: grayscale(0) brightness(1);
  }
}
</style>
