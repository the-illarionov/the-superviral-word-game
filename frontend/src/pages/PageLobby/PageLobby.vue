<script setup lang='ts'>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useHead } from '@unhead/vue'
import messages from './messages.json'
import PageLobbyPlayerName from './components/PageLobbyPlayerName.vue'
import { machineApp } from '@/machines/MachineApp/MachineApp'
import { machineLobby } from '@/machines/MachineLobby/MachineLobby'
import { generateUrljoinGame } from '@/composables/useUrlGenerator'

import ReadyButton from '@/components/ReadyButton/ReadyButton.vue'
import FormInput from '@/components/FormInput/FormInput.vue'
import FormButton from '@/components/FormButton/FormButton.vue'
import PlayerName from '@/components/PlayerName/PlayerName.vue'
import PlayerScores from '@/components/PlayerScores/PlayerScores.vue'

machineApp.send({
  type: 'User went to lobby',
})

const { t, locale } = useI18n({ messages, useScope: 'global' })

const iAmHost = computed(() => machineLobby.snapshot.value.context.myMode === 'host')
const iAmGuest = computed(() => machineLobby.snapshot.value.context.myMode === 'guest')

const isLoading = computed(() => machineLobby.snapshot.value.hasTag('loading') || machineLobby.snapshot.value.hasTag('waiting-for-host'))

const connectionEstablished = computed(() => machineLobby.snapshot.value.hasTag('connection-established'))

const isMeReady = computed(() => machineLobby.snapshot.value.context.me.isReady)
const isEnemyReady = computed(() => machineLobby.snapshot.value.context.enemy.isReady)

const enemyId = computed(() => machineLobby.snapshot.value.context.enemy.id)
const enemyName = computed(() => machineLobby.snapshot.value.context.enemy.name)

//
//
// INVITATION
const invitationLink = computed(() => generateUrljoinGame({
  hostId: machineLobby.snapshot.value.context.me.sessionId!,
  locale: locale.value,
  mode: 'guest',
}))
const invitationText = computed(() => `${t('invitation-text')} ${invitationLink.value}`)

const checkmarkEl = ref<HTMLImageElement>()

async function copy() {
  await navigator.clipboard.writeText(invitationText.value)
  checkmarkEl.value?.classList.remove('hidden')
  checkmarkEl.value?.classList.add('animation-blink')

  setTimeout(() => {
    checkmarkEl.value?.classList.remove('animation-blink')
    checkmarkEl.value?.classList.add('hidden')
  }, 500)
}

//
//
// OTHER
function sendIAmReady() {
  machineLobby.send({
    type: 'I am ready',
  })
}

//
//
// SHARE
const canShare = ref(false)

const shareData = computed<ShareData>(() => {
  return {
    text: t('invitation-text'),
    url: invitationLink.value,
  }
})

async function share() {
  await navigator.share(shareData.value)
}

//
//
// ONMOUNTED
onMounted(async () => {
  // E2E
  window.___e2e.messages.lobby = messages

  if (navigator.canShare && navigator.canShare(shareData.value))
    canShare.value = true
})

useHead({
  meta: [
    {
      name: 'og:url',
      content: import.meta.env.VITE_MODE === 'ykt' ? 'https://illarionov.school/mas-wrestling/lobby?m=h' : 'https://the-superviral-word-game.com/lobby?m=h',
    },
  ],
})
</script>

<template>
  <div
    v-show="!isLoading"
    class="flex
        pt-0
        md:pt-16
        text-center"
  >
    <div :class="$style.host">
      <p
        class="mb-2"
        data-test="host-name-value"
      >
        <PlayerName
          v-if="iAmHost"
          :is-me="true"
        >
          {{ machineLobby.snapshot.value.context.me.name }}
        </PlayerName>
        <PlayerName
          v-else
          :is-me="false"
        >
          {{ machineLobby.snapshot.value.context.enemy.name }}
        </PlayerName>
      </p>
      <div :class="$style.fighter">
        <p
          class="mb-4"
          v-html="t('oyunsky')"
        />
        <img
          src="/img/oyunsky.png"
          :class="$style.img"
        >
        <div>
          <PageLobbyPlayerName
            v-if="iAmHost"
            class="mb-4"
            data-test="host-name-input"
          />

          <ReadyButton
            :is-me="iAmHost"
            :is-me-ready="isMeReady"
            :is-enemy-ready="isEnemyReady"
            :connected="connectionEstablished"
            @i-am-ready="sendIAmReady"
          />
        </div>
      </div>
    </div>

    <div :class="$style.center">
      <div
        v-if="connectionEstablished"
        data-test="connection-established"
      >
        {{ t("connection-established") }}
        <div class="pt-5">
          {{ t('scores') }}
        </div>
        <PlayerScores
          v-if="enemyId"
          :key="enemyName"
          :enemy-id="enemyId"
          :enemy-name="enemyName"
          :i-am-guest="iAmGuest"
          class="text-5xl"
        />
      </div>
      <div v-else-if="iAmHost">
        <p
          class="animation-blink
              animation-duration-1
              mb-4"
        >
          {{ t('instructions') }}
        </p>
        <FormInput
          v-model="invitationText"
          class="!normal-case
              mb-2
              px-4
              text-shadow-none"
          readonly
          data-test="invitation"
        />

        <div class="mb-4">
          <FormButton
            data-test="copy-invitation"
            class="relative"
            @click="copy"
          >
            {{ t("copy") }}
            <img
              ref="checkmarkEl"
              class="hidden"
              src="/img/ui/checkmark.svg"
              :class="$style.checkmark"
            >
          </FormButton>

          <div
            v-if="canShare"
            class="pt-4"
          >
            <FormButton @click="share">
              {{ t("share") }}
            </FormButton>
          </div>
        </div>
      </div>
    </div>

    <div
      :class="[
        $style.guest,
        { 'animation-shake animation-duration-1': connectionEstablished && iAmHost },
      ]"
    >
      <p
        class="mb-2"
        data-test="guest-name-value"
      >
        <PlayerName
          v-if="iAmGuest"
          :is-me="true"
        >
          {{ machineLobby.snapshot.value.context.me.name }}
        </PlayerName>
        <PlayerName
          v-else
          :is-me="false"
        >
          {{ machineLobby.snapshot.value.context.enemy.name }}
        </PlayerName>
      </p>

      <div :class="$style.fighter">
        <p
          class="mb-4"
          v-html="t('kulakovsky')"
        />
        <img
          src="/img/kulakovsky.png"
          :class="[
            $style.img,
            {
              [$style.grey]: !connectionEstablished,
            },
          ]"
        >
        <div>
          <PageLobbyPlayerName
            v-if="iAmGuest"
            data-test="guest-name-input"
            class="mb-4"
          />

          <ReadyButton
            :is-me="iAmGuest"
            :is-me-ready="isMeReady"
            :is-enemy-ready="isEnemyReady"
            :connected="connectionEstablished"
            @i-am-ready="sendIAmReady"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style module lang="postcss">
.host,
.center,
.guest {
  position: relative;
  flex: 1;
  padding: 1rem;
}

.center {
  padding: 5rem 1rem 1rem;
}

.fighter {
  position: relative;

  .img {
    width: 40%;
    margin: 0 auto 1rem;

    &.grey {
      filter: grayscale(100%);
    }
  }
}

.checkmark {
  position: absolute;
  top: 0;
  right: 100%;

  width: 32px;
  margin: 0 20px 0 0;

  opacity: 0;
}
</style>
