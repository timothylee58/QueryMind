<script setup lang="ts">
import { cva, type VariantProps } from 'class-variance-authority'
import { computed } from 'vue'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold',
  {
    variants: {
      variant: {
        default: 'border-[#6366f1]/30 bg-[#6366f1]/10 text-[#818cf8]',
        success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
        warning: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
        danger: 'border-red-500/30 bg-red-500/10 text-red-400',
        muted: 'border-[#334155] bg-[#334155]/50 text-[#94a3b8]',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

type BadgeVariants = VariantProps<typeof badgeVariants>

const props = defineProps<{ variant?: BadgeVariants['variant'] }>()
const classes = computed(() => badgeVariants({ variant: props.variant }))
</script>

<template>
  <span :class="classes"><slot /></span>
</template>
