<script setup lang='ts'>
import { computed, onBeforeUnmount } from 'vue'
import PageGameCountdown from './components/PageGameCountdown.vue'
import { useCheckConditions } from './composables/useCheckConditions'
import PageGamePlayer from './components/PageGamePlayer.vue'
import PageGameWordPlayer from './components/PageGameWordPlayer.vue'
import PageGameWordMain from './components/PageGameWordMain.vue'
import PageGameRematch from './components/PageGameRematch.vue'
import PageGameRules from './components/PageGameRules.vue'
import { machineGame } from '@/machines/MachineGame/MachineGame'
import PlayerScores from '@/components/PlayerScores/PlayerScores.vue'

await useCheckConditions()

const isCountdown = computed(() => machineGame.snapshot.value.hasTag('showing-countdown'))

const isPlaying = computed(() => machineGame.snapshot.value.hasTag('playing'))
const isRematch = computed(() => machineGame.snapshot.value.hasTag('rematch'))

const isHost = computed(() => machineGame.snapshot.value.context.myMode === 'host')
const isGuest = computed(() => machineGame.snapshot.value.context.myMode === 'guest')
const playerHost = computed(() => isHost.value ? machineGame.snapshot.value.context.me : machineGame.snapshot.value.context.enemy)
const playerGuest = computed(() => isGuest.value ? machineGame.snapshot.value.context.me : machineGame.snapshot.value.context.enemy)

onBeforeUnmount(() => {
  machineGame.send({
    type: 'Sleep',
  })
})
</script>

<template>
  <div
    v-if="machineGame.snapshot.value.hasTag('awake')"
    :class="$style.wrapper"
  >
    <div
      class="flex
          flex-col
          h-full
          relative
          z-10"
    >
      <div
        class="flex
            flex-1"
      >
        <PageGamePlayer
          :is-me="isHost"
          :player="playerHost"
        />

        <PageGamePlayer
          :is-me="isGuest"
          :player="playerGuest"
        />
      </div>

      <div v-if="isPlaying">
        <PageGameWordPlayer />
        <PageGameWordMain />
      </div>

      <PageGameRematch v-else-if="isRematch" />

      <div :class="$style.scores">
        <PlayerScores
          v-if="isHost"
          :key="`${machineGame.snapshot.value.context.rounds}-host`"
          :enemy-id="playerGuest.id"
          :enemy-name="playerGuest.name"
          :i-am-guest="false"
        />
        <PlayerScores
          v-else
          :key="`${machineGame.snapshot.value.context.rounds}-guest`"
          :enemy-id="playerHost.id"
          :enemy-name="playerHost.name"
          :i-am-guest="true"
        />
      </div>
    </div>

    <PageGameCountdown v-if="isCountdown" />

    <PageGameRules v-else />

    <div
      class="bg-red-600
          damage-indicator
          damage-indicator-red"
      :class="$style.indicator"
    />
    <div
      id="indicator-green"
      class="bg-green-600
          damage-indicator
          damage-indicator-green"
      :class="$style.indicator"
    />
  </div>
</template>

<style module lang='postcss'>
.wrapper {
  height: calc(100vh - 40px);
}

.indicator {
  position: absolute;
  z-index: 0;
  top: 0;
  left: 0;

  width: 100%;
  height: 100%;

  opacity: 0;
}

.scores {
  position: absolute;
  top: 50px;
  left: 50%;
  transform: translateX(-50%);
}
</style>

<style>
.damage-indicator-active {
  animation: 0.3s forwards 1 indicator linear;
}

@keyframes indicator {
  0% {
    opacity: 0;
  }

  50% {
    opacity: 0.5;
  }

  100% {
    opacity: 0;
  }
}
</style>
