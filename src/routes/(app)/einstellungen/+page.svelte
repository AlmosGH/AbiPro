<script lang="ts">
	import { Alert, Button } from '$lib/components/ui';
	import { PageHeader, Section } from '$lib/components/page';
	import type { PageProps } from './$types';
	let { data, form }: PageProps = $props();
</script>

<svelte:head><title>Einstellungen – AbiPro</title></svelte:head>
<main>
	<PageHeader eyebrow="Konto" title="Einstellungen" description="Verwalte deinen Namen, deine gespeicherten Daten und dein Konto." />
	{#if form?.message}<Alert tone="danger">{form.message}</Alert>{:else if form?.updated}<Alert tone="success">Dein Anzeigename wurde gespeichert.</Alert>{/if}
	<Section title="Profil" description="Dieser Name wird in der App angezeigt."><div class="settings-card"><form method="POST" action="?/updateName"><label>Anzeigename<input name="displayName" value={data.profile.displayName ?? ''} maxlength="80" required /></label><Button type="submit">Änderung speichern</Button></form></div></Section>
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
