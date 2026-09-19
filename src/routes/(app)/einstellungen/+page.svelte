<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidate } from '$app/navigation';
	import { announceStatus } from '$lib/client/status';
	import { Alert, Button } from '$lib/components/ui';
	import { PageHeader, Section } from '$lib/components/page';
	import type { PageProps } from './$types';
	let { data, form }: PageProps = $props();
	function initialDisplayName() { return data.profile.displayName ?? ''; }
	let displayName = $state(initialDisplayName());
	let savingName = $state(false);

	export const snapshot = {
		capture: () => ({ displayName }),
		restore: (value: { displayName: string }) => {
			displayName = value.displayName;
			announceStatus('Nicht gespeicherte Eingabe wiederhergestellt.', 'info');
		}
	};
</script>

<svelte:head><title>Einstellungen – AbiPro</title></svelte:head>
<main>
	<PageHeader eyebrow="Konto" title="Einstellungen" description="Verwalte deinen Namen, deine gespeicherten Daten und dein Konto." />
	{#if form?.message}<Alert tone="danger">{form.message}</Alert>{:else if form?.updated}<Alert tone="success">Dein Anzeigename wurde gespeichert.</Alert>{/if}
	<Section title="Profil" description="Dieser Name wird in der App angezeigt."><div class="settings-card"><form method="POST" action="?/updateName" use:enhance={() => { savingName = true; return async ({ result, update }) => { savingName = false; await update({ reset: false, invalidateAll: false }); if (result.type === 'success') { await invalidate('app:profile'); announceStatus('Anzeigename gespeichert.', 'success'); } else announceStatus('Der Anzeigename konnte nicht gespeichert werden.', 'danger'); }; }}><label>Anzeigename<input name="displayName" bind:value={displayName} maxlength="80" required /></label><Button type="submit" disabled={savingName}>{savingName ? 'Wird gespeichert …' : 'Änderung speichern'}</Button></form></div></Section>
	<Section title="Meine Daten" description="Lade eine maschinenlesbare Kopie deiner Konto- und Lerndaten herunter."><div class="settings-card row"><div><strong>Datenexport</strong><p>Enthält dein Profil, Versuche, Antworten und Bewertungen.</p></div><Button href="/profil/export" variant="secondary">JSON exportieren</Button></div></Section>
	<Section title="Gefahrenbereich" description="Diese Aktionen lassen sich nicht rückgängig machen."><div class="settings-card danger-zone"><details><summary>Konto und alle Lerndaten löschen</summary><form method="POST" action="?/deleteAccount"><p>Gib zur Bestätigung <strong>LÖSCHEN</strong> ein.</p><label>Bestätigung<input name="confirmation" autocomplete="off" required /></label><Button type="submit" variant="danger">Konto endgültig löschen</Button></form></details></div></Section>
</main>

<style>
	.settings-card { padding: var(--space-5); border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: var(--color-surface); box-shadow: var(--shadow-sm); }
	.settings-card form { max-width: 42rem; }
	.row { display: flex; align-items: center; justify-content: space-between; gap: var(--space-5); }
	.row p { margin: var(--space-1) 0 0; color: var(--color-muted); }
	.danger-zone { border-color: #efc7c2; }
	.danger-zone details { padding: 0; border: 0; }
	.danger-zone form { display: grid; margin-top: var(--space-5); }
	@media(max-width: 40rem) { .row { align-items: stretch; flex-direction: column; } }
</style>
