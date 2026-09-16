<script lang="ts">
	let { name, size = 20 }: { name: 'home' | 'tasks' | 'practice' | 'exam' | 'progress' | 'settings' | 'admin' | 'chevron' | 'clock' | 'spark' | 'chart' | 'check' | 'user'; size?: number } = $props();
</script>
<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
	{#if name === 'home'}<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z" />
	{:else if name === 'tasks'}<path d="M9 5h11M9 12h11M9 19h11"/><path d="m3 5 1 1 2-2M3 12l1 1 2-2M3 19l1 1 2-2"/>
	{:else if name === 'practice'}<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/>
	{:else if name === 'exam'}<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 1.5M9 2h6"/>
	{:else if name === 'progress'}<path d="M4 20V10M10 20V4M16 20v-7M22 20V7"/>
	{:else if name === 'settings'}<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21H9.6v-.1A1.7 1.7 0 0 0 8.5 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3V9.6h.1A1.7 1.7 0 0 0 4.6 8.5a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3h4v.1A1.7 1.7 0 0 0 15.5 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.13.4.34.75.6 1 .3.3.7.5 1.1.5h.1v4h-.1A1.7 1.7 0 0 0 19.4 15Z"/>
	{:else if name === 'admin'}<path d="M12 3 4 7v5c0 5 3.4 8.3 8 9 4.6-.7 8-4 8-9V7l-8-4Z"/><path d="m9 12 2 2 4-4"/>
	{:else if name === 'chevron'}<path d="m9 18 6-6-6-6"/>
	{:else if name === 'clock'}<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>
	{:else if name === 'spark'}<path d="m12 3 1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3ZM19 15l.7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7L19 15Z"/>
	{:else if name === 'chart'}<path d="M4 19V9M10 19V5M16 19v-7M22 19V3"/>
	{:else if name === 'check'}<path d="m5 12 4 4L19 6"/>
	{:else}<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>{/if}
</svg>
