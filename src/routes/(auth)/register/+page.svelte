<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';
	let { form }: PageProps = $props();
	let showPassword = $state(false);
	let submitting = $state(false);
</script>

<svelte:head><title>Registrieren – AbiPro</title><meta name="description" content="Erstelle dein AbiPro-Konto und starte deine persönliche Abiturvorbereitung." /></svelte:head>
<main class="auth-page"><section class="auth-card">
	<div class="brand-mark" aria-hidden="true">A</div><span class="brand-name">AbiPro</span>
	{#if form?.checkEmail}
		<div class="success-state"><span>✉</span><h1>Fast geschafft</h1><p>Wir haben dir einen Bestätigungslink an <strong>{form.email}</strong> gesendet. Öffne ihn, um dein Konto zu aktivieren.</p><a class="button-link" href="/login">Zur Anmeldung</a></div>
	{:else}
		<div class="auth-heading"><h1>Dein Lernplan beginnt hier</h1><p>Persönlicher Fortschritt, echte Aufgaben und gezielte Empfehlungen.</p></div>
		{#if form?.message}<div class="error-box" role="alert"><strong>Registrierung nicht möglich</strong><span>{form.message}</span><small>Prüfe die markierten Angaben und versuche es erneut.</small></div>{/if}
		<form method="POST" use:enhance={() => { submitting = true; return async ({ update }) => { await update(); submitting = false; }; }}>
			<label>Name<input name="displayName" autocomplete="name" required maxlength="100" value={form?.displayName ?? ''} placeholder="Dein Name" /></label>
			<label>E-Mail-Adresse<input name="email" type="email" autocomplete="email" required value={form?.email ?? ''} placeholder="name@beispiel.de" /></label>
			<label>Passwort<div class="password-field"><input name="password" type={showPassword ? 'text' : 'password'} autocomplete="new-password" required minlength="8" aria-describedby="password-hint" /><button type="button" onclick={() => showPassword = !showPassword}>{showPassword ? 'Verbergen' : 'Anzeigen'}</button></div><small id="password-hint">Mindestens 8 Zeichen</small></label>
			<button class="submit" type="submit" disabled={submitting}>{submitting ? 'Konto wird erstellt …' : 'Konto erstellen'}</button>
		</form>
		<p class="switch">Bereits registriert? <a href="/login">Anmelden</a></p>
		<div class="trust"><span>✓ Kostenlos starten</span><span>✓ Keine Weitergabe deiner Lerndaten</span><span>✓ Jederzeit löschbar</span></div>
	{/if}
</section></main>

<style>
	.auth-page { display: grid; min-height: calc(100vh - 8rem); place-items: center; padding-block: var(--space-10); }.auth-card { width: min(100%, 29rem); padding: var(--space-8); border: 1px solid var(--color-border); border-radius: var(--radius-xl); background: var(--color-surface); box-shadow: var(--shadow-md); text-align: center; }.brand-mark { display: grid; width: 3rem; height: 3rem; margin: 0 auto .5rem; place-items: center; border-radius: .8rem; background: var(--color-brand-strong); color: #ffc28f; font-family: var(--font-display); font-size: 1.4rem; font-weight: 800; }.brand-name { color: var(--color-brand-strong); font-weight: 800; }.auth-heading { margin: var(--space-6) 0; }.auth-heading h1,.success-state h1 { margin-bottom: var(--space-2); font-size: 2rem; }.auth-heading p,.success-state p { margin: 0; color: var(--color-muted); font-size: .92rem; }form { display: grid; text-align: left; }.submit { width: 100%; }.password-field { position: relative; }.password-field input { padding-right: 5.5rem !important; }.password-field button { position: absolute; top: 50%; right: .35rem; min-height: 2rem; transform: translateY(-50%); padding: .25rem .5rem; border: 0; background: transparent; color: var(--color-brand-strong); font-size: .75rem; }.password-field button:hover { background: var(--color-brand-soft); color: var(--color-brand-strong); }label > small { color: var(--color-muted); font-weight: 400; }.error-box { display: grid; gap: .2rem; margin-bottom: var(--space-4); padding: var(--space-3); border-radius: var(--radius-md); background: var(--color-danger-soft); color: var(--color-danger); text-align: left; font-size: .85rem; }.switch { margin: var(--space-5) 0; font-size: .88rem; }.trust { display: flex; flex-wrap: wrap; justify-content: center; gap: var(--space-2) var(--space-4); padding-top: var(--space-4); border-top: 1px solid var(--color-border); color: var(--color-muted); font-size: .73rem; }.success-state { display: grid; gap: var(--space-4); margin-top: var(--space-8); }.success-state > span { font-size: 2.5rem; }.success-state .button-link { margin-top: var(--space-2); }.success-state strong { color: var(--color-ink); }
	@media(max-width: 35rem) { .auth-page { width: 100%; padding: 0; }.auth-card { padding: var(--space-6) var(--space-4); border: 0; box-shadow: none; } }
</style>
