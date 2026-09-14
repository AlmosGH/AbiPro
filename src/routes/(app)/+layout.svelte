<script lang="ts">
	import type { LayoutProps } from './$types';
	let { data, children }: LayoutProps = $props();
</script>

<header>
	<a href="/profil">AbiPro</a>
	<nav aria-label="Hauptnavigation">
		<a href="/aufgaben">Aufgaben</a>
		<a href="/uben">Üben</a>
		<a href="/prufung">Prüfung</a>
		<a href="/profil">Profil</a>
		{#if data.profile.role === 'admin'}<a href="/admin">Administration</a>{/if}
	</nav>
	<form method="POST" action="/logout"><button type="submit">Abmelden</button></form>
</header>

{@render children()}
