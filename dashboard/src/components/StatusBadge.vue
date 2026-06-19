<script setup lang="ts">
defineProps<{ status: string }>()

const COLOR: Record<string, string> = {
  active:      'badge--green',
  approved:    'badge--green',
  applied:     'badge--blue',
  pending:     'badge--yellow',
  modified:    'badge--orange',
  inactive:    'badge--gray',
  rejected:    'badge--red',
  maintenance: 'badge--orange',
  scheduled:   'badge--blue',
  cancelled:   'badge--red',
  in_progress: 'badge--green',
}
</script>

<template>
  <span class="badge" :class="COLOR[status] ?? 'badge--gray'">{{ status }}</span>
</template>

<style scoped>
.badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.badge--green  { background: #dcfce7; color: #166534; }
.badge--blue   { background: #dbeafe; color: #1e40af; }
.badge--yellow { background: #fef9c3; color: #854d0e; }
.badge--orange { background: #ffedd5; color: #9a3412; }
.badge--gray   { background: #f1f5f9; color: #475569; }
.badge--red    { background: #fee2e2; color: #991b1b; }
</style>
