<template>
  <div :class="$style.container">
    <slot />
  </div>
</template>

<style module lang='postcss'>
.container {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;

  width: 100%;
}
</style>
