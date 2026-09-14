<script lang="ts">
	import type { PageProps } from './$types';
	let { data }: PageProps = $props();
</script>

<svelte:head><title>Profil – AbiPro</title></svelte:head>
<main>
	<h1>Profil</h1>
	<p>Angemeldet als {data.profile.displayName ?? 'Lernende Person'}.</p>
	<p>Rolle: {data.profile.role}</p>
</main>
