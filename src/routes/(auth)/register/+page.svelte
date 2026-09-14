<script lang="ts">
	import type { PageProps } from './$types';
	let { form }: PageProps = $props();
</script>

<svelte:head><title>Registrieren – AbiPro</title></svelte:head>
<main>
	<h1>Konto erstellen</h1>
	{#if form?.checkEmail}
		<p role="status">Prüfe dein E-Mail-Postfach und bestätige deine Registrierung.</p>
	{:else}
		{#if form?.message}<p role="alert">{form.message}</p>{/if}
		<form method="POST">
			<label>Name <input name="displayName" autocomplete="name" required maxlength="100" value={form?.displayName ?? ''} /></label>
			<label>E-Mail-Adresse <input name="email" type="email" autocomplete="email" required value={form?.email ?? ''} /></label>
			<label>Passwort <input name="password" type="password" autocomplete="new-password" required minlength="8" /></label>
			<button type="submit">Registrieren</button>
		</form>
	{/if}
	<p>Bereits registriert? <a href="/login">Anmelden</a>.</p>
</main>
