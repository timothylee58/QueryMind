<script setup lang="ts">
defineProps<{
  modelValue?: string
  placeholder?: string
  type?: string
  disabled?: boolean
  id?: string
  ariaLabel?: string
  ariaDescribedby?: string
  required?: boolean
}>()

defineEmits<{
  'update:modelValue': [value: string]
  keydown: [event: KeyboardEvent]
}>()
</script>

<template>
  <input
    :id="id"
    :value="modelValue"
    :placeholder="placeholder"
    :type="type ?? 'text'"
    :disabled="disabled"
    :required="required"
    :aria-label="ariaLabel"
    :aria-describedby="ariaDescribedby"
    class="flex h-9 w-full rounded-md border border-[#334155] bg-[#1e293b] px-3 py-2 text-sm text-[#f1f5f9] placeholder:text-[#64748b] focus:outline-none focus:ring-2 focus:ring-[#6366f1] disabled:cursor-not-allowed disabled:opacity-50"
    @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    @keydown="$emit('keydown', $event)"
  />
</template>
