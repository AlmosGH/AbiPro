<script lang="ts">
	import { page } from '$app/state';
	import type { LayoutProps } from './$types';
	let { data, children }: LayoutProps = $props();
	let menuOpen = $state(false);
	const initials = $derived((data.profile.displayName ?? 'AK').split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase());
</script>

<header class="app-header">
	<div class="header-main">
		<a class="brand" href="/profil" aria-label="AbiPro Startseite">
			<span class="brand-mark" aria-hidden="true">A</span>
			<span><strong>Abi<span>Pro</span></strong><small>Geschichte · Mittelstufe</small></span>
		</a>
		<button class="menu-button" type="button" aria-label="Navigation öffnen" aria-expanded={menuOpen} onclick={() => menuOpen = !menuOpen}>
			<span aria-hidden="true">{menuOpen ? '×' : '☰'}</span>
		</button>
		<nav class:open={menuOpen} aria-label="Hauptnavigation">
			<a href="/aufgaben" aria-current={page.url.pathname.startsWith('/aufgaben') ? 'page' : undefined} onclick={() => menuOpen = false}><span aria-hidden="true">▤</span> Aufgaben</a>
			<a href="/uben" aria-current={page.url.pathname.startsWith('/uben') ? 'page' : undefined} onclick={() => menuOpen = false}><span aria-hidden="true">✎</span> Üben</a>
			<a href="/prufung" aria-current={page.url.pathname.startsWith('/prufung') ? 'page' : undefined} onclick={() => menuOpen = false}><span aria-hidden="true">⌛</span> Prüfung</a>
			<a href="/profil" aria-current={page.url.pathname.startsWith('/profil') ? 'page' : undefined} onclick={() => menuOpen = false}><span aria-hidden="true">◉</span> Fortschritt</a>
			{#if data.profile.role === 'admin'}<a href="/admin" aria-current={page.url.pathname.startsWith('/admin') ? 'page' : undefined} onclick={() => menuOpen = false}><span aria-hidden="true">⚙</span> Verwaltung</a>{/if}
		</nav>
		<div class="account">
			<a href="/profil" class="avatar" aria-label="Profil öffnen">{initials}</a>
			<span><strong>{data.profile.displayName ?? 'Lernprofil'}</strong><small>Lernprofil</small></span>
			<form method="POST" action="/logout"><button class="logout" type="submit">Abmelden</button></form>
		</div>
	</div>
	<div class="archive-strip">
		<span><b>✦ Maturafokus 2026</b> · Frühneuzeit, Quellenarbeit &amp; Prüfungstraining</span>
		<em>„Historia est magistra vitae.“</em>
	</div>
</header>

{@render children()}
