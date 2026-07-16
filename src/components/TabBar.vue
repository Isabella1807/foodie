<script setup>
defineProps({ modelValue: String })
defineEmits(['update:modelValue'])

const tabs = [
  { id: 'today', label: 'I dag', icon: '🍽️' },
  { id: 'history', label: 'Historik', icon: '📅' },
  { id: 'foods', label: 'Mad', icon: '🍎' },
]
</script>

<template>
  <nav class="tabbar">
    <button
      v-for="tab in tabs"
      :key="tab.id"
      class="tabbar-item"
      :class="{ active: tab.id === modelValue }"
      @click="$emit('update:modelValue', tab.id)"
    >
      <span class="tabbar-icon" aria-hidden="true">{{ tab.icon }}</span>
      <span>{{ tab.label }}</span>
    </button>
  </nav>
</template>
