<script setup lang="ts">
import { cva, type VariantProps } from 'class-variance-authority'
import { computed } from 'vue'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6366f1] disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-[#6366f1] text-white hover:bg-[#4f46e5]',
        secondary: 'bg-[#1e293b] text-[#f1f5f9] border border-[#334155] hover:bg-[#334155]',
        ghost: 'text-[#94a3b8] hover:bg-[#1e293b] hover:text-[#f1f5f9]',
        destructive: 'bg-red-600 text-white hover:bg-red-700',
        success: 'bg-emerald-600 text-white hover:bg-emerald-700',
        link: 'text-[#6366f1] underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-7 rounded-md px-3 text-xs',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-9 w-9',
        'icon-sm': 'h-7 w-7',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
)

type ButtonVariants = VariantProps<typeof buttonVariants>

const props = withDefaults(defineProps<{
  variant?: ButtonVariants['variant']
  size?: ButtonVariants['size']
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  ariaLabel?: string
}>(), { type: 'button' })

const classes = computed(() => buttonVariants({ variant: props.variant, size: props.size }))
</script>

<template>
  <button
    :class="classes"
    :disabled="disabled"
    :type="type"
    :aria-label="ariaLabel"
  >
    <slot />
  </button>
</template>
