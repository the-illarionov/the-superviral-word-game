<script setup lang='ts'>
import { useI18n } from 'vue-i18n'
import { ref } from 'vue'
import { watchDebounced } from '@vueuse/core'
import messages from '../messages.json'
import FormInput from '@/components/FormInput/FormInput.vue'
import { machineLobby } from '@/machines/MachineLobby/MachineLobby'

const { t } = useI18n({ messages, useScope: 'global' })

const name = ref(machineLobby.snapshot.value.context.me.name)

watchDebounced(name, (newName) => {
  machineLobby.send({
    type: 'I changed name',
    name: newName,
  })

  localStorage.setItem('name', newName)
}, {
  debounce: 250,
})
</script>

<template>
  <FormInput
    v-model="name"
    :placeholder="t('your-name')"
    :wrapper-classes="['max-w-[400px]', 'mx-auto']"
  />
</template>
