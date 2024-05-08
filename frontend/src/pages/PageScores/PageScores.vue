<script setup lang='ts'>
import { useI18n } from 'vue-i18n'
import FormButton from '@/components/FormButton/FormButton.vue'
import type { Scores } from '@/components/PlayerScores/types'

const { t } = useI18n({ useScope: 'global' })

let scoresSaved = localStorage.getItem('scores')

if (!scoresSaved)
  scoresSaved = '{}'

const scores: Scores = JSON.parse(scoresSaved)

const scoresKeys = Object.keys(scores)

const scoresKeysWithoutEmpty = scoresKeys.filter((scoreKey) => {
  return scores[scoreKey][0] > 0 || scores[scoreKey][1] > 0
})

scoresKeysWithoutEmpty.sort((a, b) => {
  return scores[b][0] - scores[a][0]
})
</script>

<template>
  <div
    class="mx-auto
        p-6
        pt-12
        md:w-2/3"
  >
    <p
      class="mb-4
          text-center"
    >
      <RouterLink :to="{ name: 'PageIndex' }">
        <FormButton>
          {{ t('go-to-menu') }}
        </FormButton>
      </RouterLink>
    </p>

    <template v-if="scoresKeysWithoutEmpty.length > 0">
      <p
        class="mb-4
            text-center"
      >
        {{ t('scores-menu') }}
      </p>

      <table :class="$style.table">
        <thead>
          <tr>
            <th class="w-full">
              {{ t('name') }}
            </th>
            <th>
              {{ t('scores-wins') }}
            </th>
            <th>
              {{ t('scores-loses') }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(scoreKey, index) in scoresKeysWithoutEmpty"
            :key="index"
            :data-test="`scores-${scoreKey}`"
          >
            <td class="name">
              {{ scores[scoreKey][2] }}
            </td>
            <td
              class="text-center
                  wins"
            >
              {{ scores[scoreKey][0] }}
            </td>
            <td
              class="loses
                  text-center"
            >
              {{ scores[scoreKey][1] }}
            </td>
          </tr>
        </tbody>
      </table>
    </template>

    <p
      v-else
      class="text-center"
      data-test="no-scores"
    >
      {{ t('no-scores') }}
    </p>
  </div>
</template>

<style module lang='postcss'>
.table {
  width: 100%;
  text-align: left;

  td,
  th {
    padding: 0.5rem;
  }
}
</style>
