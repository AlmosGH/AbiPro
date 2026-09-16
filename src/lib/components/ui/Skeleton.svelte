<script lang="ts">let { width = '100%', height = '1rem' }: { width?: string; height?: string } = $props();</script>
<span style={`width:${width};height:${height}`} aria-hidden="true"></span>
<style>span { display: block; border-radius: var(--radius-sm); background: linear-gradient(90deg, var(--color-surface-soft), #f8faf9, var(--color-surface-soft)); background-size: 200% 100%; animation: shimmer 1.4s infinite; } @keyframes shimmer { to { background-position: -200% 0; } }</style>
