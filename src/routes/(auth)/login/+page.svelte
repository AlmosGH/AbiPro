<script lang="ts">
	import type { PageProps } from './$types';
	let { data, form }: PageProps = $props();
</script>

<svelte:head><title>Anmelden – AbiPro</title></svelte:head>
<main>
	<h1>Anmelden</h1>
	{#if data.callbackFailed}<p role="alert">Der Anmeldelink konnte nicht bestätigt werden. Bitte versuche es erneut.</p>{/if}
	{#if form?.message}<p role="alert">{form.message}</p>{/if}
	<form method="POST" action="?/email">
		<input type="hidden" name="next" value={data.next} />
		<label>E-Mail-Adresse <input name="email" type="email" autocomplete="email" required value={form?.email ?? ''} /></label>
		<label>Passwort <input name="password" type="password" autocomplete="current-password" required /></label>
		<button type="submit">Anmelden</button>
	</form>
	<p aria-hidden="true">oder</p>
	<form method="POST" action="?/google">
		<input type="hidden" name="next" value={data.next} />
		<button type="submit">Mit Google anmelden</button>
	</form>
	<p>Noch kein Konto? <a href="/register">Jetzt registrieren</a>.</p>
</main>
