<script setup lang='ts'>
import type { Scores } from './types'

const props = defineProps<{
  enemyId: string
  enemyName: string
  iAmGuest: boolean
}>()

let scoresSaved = localStorage.getItem('scores')

if (!scoresSaved) {
  scoresSaved = '{}'
  localStorage.setItem('scores', scoresSaved)
}

const scores: Scores = JSON.parse(scoresSaved)

if (!scores[props.enemyId])
  scores[props.enemyId] = [0, 0, '']

scores[props.enemyId][2] = props.enemyName

localStorage.setItem('scores', JSON.stringify(scores))
</script>

<template>
  <div
    class="flex
        justify-center"
    :class="{
      'flex-row-reverse': iAmGuest,
    }"
  >
    <span data-test="player-scores-wins">{{ scores[props.enemyId][0] }}</span>
    <span class="mx-1">:</span>
    <span data-test="player-scores-loses">{{ scores[props.enemyId][1] }}</span>
  </div>
</template>
