<script lang="ts">
	import { onMount } from 'svelte';
	import { appStatuses, announceStatus, dismissStatus } from '$lib/client/status';

	let online = $state(true);

	onMount(() => {
		online = navigator.onLine;
		let offlineStatusId: number | undefined;
		const handleOnline = () => {
			online = true;
			if (offlineStatusId) dismissStatus(offlineStatusId);
			offlineStatusId = undefined;
			announceStatus('Verbindung wiederhergestellt. Ausstehende Änderungen werden gespeichert.', 'success');
		};
		const handleOffline = () => {
			online = false;
			if (!offlineStatusId) offlineStatusId = announceStatus('Du bist offline. Änderungen bleiben lokal erhalten.', 'warning', 0);
		};
		window.addEventListener('online', handleOnline);
		window.addEventListener('offline', handleOffline);
		if (!online) handleOffline();
		return () => {
			window.removeEventListener('online', handleOnline);
			window.removeEventListener('offline', handleOffline);
		};
	});
</script>

{#if !online}<div class="offline" role="status">Offline – Änderungen werden später synchronisiert</div>{/if}
<section class="status-center" aria-label="Statusmeldungen" aria-live="polite">
	{#each $appStatuses as item (item.id)}
		<div class:danger={item.tone === 'danger'} class:warning={item.tone === 'warning'} class:success={item.tone === 'success'} role={item.tone === 'danger' ? 'alert' : 'status'}>
			<span>{item.message}</span><button type="button" aria-label="Meldung schließen" onclick={() => dismissStatus(item.id)}>×</button>
		</div>
	{/each}
</section>

<style>
	.offline { position: fixed; z-index: 60; inset: 0 0 auto; padding: .45rem 1rem; background: #9a6414; color: white; text-align: center; font-size: .8rem; font-weight: 700; }
	.status-center { position: fixed; z-index: 70; right: var(--space-4); bottom: var(--space-4); display: grid; width: min(24rem, calc(100vw - 2rem)); gap: var(--space-2); pointer-events: none; }
	.status-center > div { display: flex; align-items: start; justify-content: space-between; gap: var(--space-3); padding: var(--space-3) var(--space-4); border-radius: var(--radius-md); background: #273b34; color: white; box-shadow: var(--shadow-md); pointer-events: auto; }
	.status-center .success { background: #176647; }.status-center .warning { background: #835710; }.status-center .danger { background: var(--color-danger); }
	button { min-width: 1.75rem; min-height: 1.75rem; padding: 0; border: 0; background: transparent; color: inherit; font-size: 1.25rem; }
	@media(max-width: 40rem) { .status-center { bottom: 5rem; } }
</style>
