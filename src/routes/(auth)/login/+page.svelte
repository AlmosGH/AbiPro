<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';
	let { data, form }: PageProps = $props();
	let showPassword = $state(false);
	let submitting = $state(false);
</script>

<svelte:head><title>Anmelden – AbiPro</title><meta name="description" content="Melde dich bei AbiPro an und setze deine Abiturvorbereitung fort." /></svelte:head>
<main class="auth-page">
	<section class="auth-card">
		<div class="brand-mark" aria-hidden="true">A</div><span class="brand-name">AbiPro</span>
		<div class="auth-heading"><h1>Willkommen zurück</h1><p>Übe gezielt, erkenne Lücken und gehe sicherer in die Prüfung.</p></div>
		{#if data.callbackFailed}<div class="error-box" role="alert"><strong>Der Anmeldelink ist abgelaufen.</strong><span>Bitte melde dich erneut an.</span></div>{/if}
		{#if form?.message}<div class="error-box" role="alert"><strong>Anmeldung nicht möglich</strong><span>{form.message}</span></div>{/if}
		<form method="POST" action="?/email" use:enhance={() => { submitting = true; return async ({ update }) => { await update(); submitting = false; }; }}>
			<input type="hidden" name="next" value={data.next} />
			<label>E-Mail-Adresse<input name="email" type="email" autocomplete="email" required value={form?.email ?? ''} placeholder="name@beispiel.de" /></label>
			<label>Passwort<div class="password-field"><input name="password" type={showPassword ? 'text' : 'password'} autocomplete="current-password" required /><button type="button" onclick={() => showPassword = !showPassword}>{showPassword ? 'Verbergen' : 'Anzeigen'}</button></div></label>
			<button class="submit" type="submit" disabled={submitting}>{submitting ? 'Anmeldung läuft …' : 'Anmelden'}</button>
		</form>
		<div class="divider"><span>oder</span></div>
		<form method="POST" action="?/google"><input type="hidden" name="next" value={data.next} /><button class="google" type="submit">Mit Google anmelden</button></form>
		<p class="switch">Noch kein Konto? <a href="/register">Kostenlos registrieren</a></p>
		<div class="trust"><span>✓ Deine Lerndaten bleiben privat.</span><span>✓ Du kannst dein Konto jederzeit löschen.</span></div>
	</section>
</main>

<style>
	.auth-page { display: grid; min-height: calc(100vh - 8rem); place-items: center; padding-block: var(--space-10); }
	.auth-card { width: min(100%, 29rem); padding: var(--space-8); border: 1px solid var(--color-border); border-radius: var(--radius-xl); background: var(--color-surface); box-shadow: var(--shadow-md); text-align: center; }
	.brand-mark { display: grid; width: 3rem; height: 3rem; margin: 0 auto .5rem; place-items: center; border-radius: .8rem; background: var(--color-brand-strong); color: #ffc28f; font-family: var(--font-display); font-size: 1.4rem; font-weight: 800; }.brand-name { color: var(--color-brand-strong); font-weight: 800; }
	.auth-heading { margin: var(--space-6) 0; }.auth-heading h1 { margin-bottom: var(--space-2); font-size: 2.1rem; }.auth-heading p { margin: 0; color: var(--color-muted); font-size: .92rem; }
	form { display: grid; text-align: left; }.submit, .google { width: 100%; }.password-field { position: relative; }.password-field input { padding-right: 5.5rem !important; }.password-field button { position: absolute; top: 50%; right: .35rem; min-height: 2rem; transform: translateY(-50%); padding: .25rem .5rem; border: 0; background: transparent; color: var(--color-brand-strong); font-size: .75rem; }.password-field button:hover { background: var(--color-brand-soft); color: var(--color-brand-strong); }
	.error-box { display: grid; gap: .2rem; margin-bottom: var(--space-4); padding: var(--space-3); border-radius: var(--radius-md); background: var(--color-danger-soft); color: var(--color-danger); text-align: left; font-size: .85rem; }.divider { display: flex; align-items: center; gap: var(--space-3); margin: var(--space-5) 0; color: var(--color-muted); font-size: .75rem; }.divider::before,.divider::after { height: 1px; flex: 1; background: var(--color-border); content: ''; }.google { border-color: var(--color-border-strong); background: white; color: var(--color-ink); }.google:hover { background: var(--color-surface-soft); color: var(--color-ink); }.switch { margin: var(--space-5) 0; font-size: .88rem; }.trust { display: grid; gap: .4rem; padding-top: var(--space-4); border-top: 1px solid var(--color-border); color: var(--color-muted); font-size: .75rem; text-align: left; }
	@media(max-width: 35rem) { .auth-page { width: 100%; padding: 0; }.auth-card { padding: var(--space-6) var(--space-4); border: 0; box-shadow: none; } }
</style>
