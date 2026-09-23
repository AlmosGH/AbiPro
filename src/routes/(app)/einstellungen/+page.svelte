<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidate } from '$app/navigation';
	import { announceStatus } from '$lib/client/status';
	import { Alert, Button } from '$lib/components/ui';
	import { PageHeader, Section } from '$lib/components/page';
	import LanguagePicker from '$lib/components/LanguagePicker.svelte';
	import { getLanguageContext } from '$lib/i18n';
	import type { PageProps } from './$types';
	let { data, form }: PageProps = $props();
	const language = getLanguageContext();
	function initialDisplayName() { return data.profile.displayName ?? ''; }
	let displayName = $state(initialDisplayName());
	let savingName = $state(false);

	export const snapshot = {
		capture: () => ({ displayName }),
		restore: (value: { displayName: string }) => {
			displayName = value.displayName;
			announceStatus(language.t('Nicht gespeicherte Eingabe wiederhergestellt.'), 'info');
		}
	};
</script>

<svelte:head><title>{language.t('Einstellungen')} – AbiPro</title></svelte:head>
<main>
	<PageHeader eyebrow={language.t('Konto')} title={language.t('Einstellungen')} description={language.t('Verwalte deinen Namen, deine gespeicherten Daten und dein Konto.')} />
	<section class="settings-card language-section"><div><h2>{language.t('Sprache')}</h2><p>{language.t('Wähle die Sprache für die Benutzeroberfläche.')}</p></div><LanguagePicker /></section>
	{#if form?.message}<Alert tone="danger">{form.message}</Alert>{:else if form?.updated}<Alert tone="success">{language.t('Dein Anzeigename wurde gespeichert.')}</Alert>{/if}
	<Section title={language.t('Profil')} description={language.t('Dein Name wird in der App angezeigt.')}><div class="settings-card"><form method="POST" action="?/updateName" use:enhance={() => { savingName = true; return async ({ result, update }) => { savingName = false; await update({ reset: false, invalidateAll: false }); if (result.type === 'success') { await invalidate('app:profile'); announceStatus(language.t('Anzeigename gespeichert.'), 'success'); } else announceStatus(language.t('Der Anzeigename konnte nicht gespeichert werden.'), 'danger'); }; }}><label>{language.t('Anzeigename')}<input name="displayName" bind:value={displayName} maxlength="80" required /></label><Button type="submit" disabled={savingName}>{savingName ? language.t('Wird gespeichert …') : language.t('Änderung speichern')}</Button></form></div></Section>
	<Section title={language.t('Meine Daten')} description={language.t('Lade eine maschinenlesbare Kopie deiner Konto- und Lerndaten herunter.')}><div class="settings-card row"><div><strong>{language.t('Datenexport')}</strong><p>{language.t('Enthält dein Profil, Versuche, Antworten und Bewertungen.')}</p></div><Button href="/profil/export" variant="secondary">{language.t('JSON exportieren')}</Button></div></Section>
	<Section title={language.t('Gefahrenbereich')} description={language.t('Diese Aktionen lassen sich nicht rückgängig machen.')}><div class="settings-card danger-zone"><details><summary>{language.t('Konto und alle Lerndaten löschen')}</summary><form method="POST" action="?/deleteAccount"><p>{language.t('Gib zur Bestätigung ')}<strong>LÖSCHEN</strong> {language.t('ein.')}</p><label>{language.t('Bestätigung')}<input name="confirmation" autocomplete="off" required /></label><Button type="submit" variant="danger">{language.t('Konto endgültig löschen')}</Button></form></details></div></Section>
</main>

<style>
	.settings-card { padding: var(--space-5); border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: var(--color-surface); box-shadow: var(--shadow-sm); }
	.language-section { display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); }
	.language-section h2 { margin: 0 0 .3rem; font-size: 1rem; }
	.language-section p { margin: 0; color: var(--color-muted); }
	.settings-card form { max-width: 42rem; }
	.row { display: flex; align-items: center; justify-content: space-between; gap: var(--space-5); }
	.row p { margin: var(--space-1) 0 0; color: var(--color-muted); }
	.danger-zone { border-color: #efc7c2; }
	.danger-zone details { padding: 0; border: 0; }
	.danger-zone form { display: grid; margin-top: var(--space-5); }
	@media(max-width: 40rem) { .row { align-items: stretch; flex-direction: column; } }
</style>
