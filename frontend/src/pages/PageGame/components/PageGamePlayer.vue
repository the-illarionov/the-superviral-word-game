<script setup lang="ts">
import type { Player } from '@/machines/MachineGame/MachineGame'
import PlayerName from '@/components/PlayerName/PlayerName.vue'

defineProps<{
  player: Player
  isMe: boolean
}>()
</script>

<template>
  <div
    :class="[
      $style.container,
      {
        [$style.guest]: $props.player.mode === 'guest',
      },
    ]"
  >
    <div :class="$style.hp">
      <div
        :class="$style['hp-progress']"
        :style="{
          width: `${$props.player.hp}%`,
        }"
      />
    </div>
    <div :class="$style.name">
      <PlayerName :is-me="isMe">
        {{ player.name }}
      </PlayerName>
    </div>
    <div
      v-show="$props.player.guessedWords.length > 0"
      :class="$style['guessed-words']"
    >
      <ul :class="$style.wrapper">
        <li
          v-for="word in [...$props.player.guessedWords].reverse()"
          :key="`guessed-word-${word}`"
        >
          {{ word }}
        </li>
      </ul>
    </div>
  </div>
</template>

<style module lang="postcss">
.container {
  position: relative;

  width: 50%;
  height: 100%;
  padding: 0.5rem;
  padding-right: 2rem;

  &.guest {
    padding-right: 0.5rem;
    padding-left: 2rem;
  }
}

.hp {
  position: relative;
  height: 20px;

  @apply bg-red-700;
}

.hp-progress {
  position: absolute;
  top: 0;
  right: 0;

  height: 100%;

  @apply bg-green-900;

  transition: width 0.3s;
}

.name {
  position: absolute;
  top: 30px;
  left: 0.5rem;
}

.guessed-words {
  position: absolute;
  top: 70px;
  bottom: 0;
  left: 0.5rem;

  overflow-y: auto;

  .wrapper {
    padding: 0.25rem 0.5rem;
    background: rgb(0 0 0 / 50%);
  }
}

.guest {
  .hp-progress {
    right: auto;
    left: 0;
  }

  .guessed-words,
  .name {
    right: 0.5rem;
    left: auto;
    text-align: right;
  }
}
</style>
