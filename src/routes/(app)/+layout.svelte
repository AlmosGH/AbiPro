<script lang="ts">
	import { page } from '$app/state';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();
	const initials = $derived((data.profile.displayName ?? 'AK').split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase());
	const path = $derived(page.url.pathname);
	const pageTitle = $derived(path === '/' ? 'Übersicht' : path.startsWith('/aufgaben') ? 'Aufgaben' : path.startsWith('/uben') ? 'Üben' : path.startsWith('/prufung') ? 'Prüfung' : path.startsWith('/profil') ? 'Fortschritt' : path.startsWith('/einstellungen') ? 'Einstellungen' : path.startsWith('/admin') ? 'Verwaltung' : 'AbiPro');
	const learnerItems = [
		{ href: '/aufgaben', label: 'Aufgaben', icon: 'tasks' as const },
		{ href: '/uben', label: 'Üben', icon: 'practice' as const },
		{ href: '/prufung', label: 'Prüfung', icon: 'exam' as const },
		{ href: '/profil', label: 'Fortschritt', icon: 'progress' as const }
	];
</script>

<div class="app-shell">
	<aside class="sidebar">
		<a class="brand" href="/" aria-label="AbiPro Übersicht"><span aria-hidden="true">A</span><strong>AbiPro</strong></a>
		<nav aria-label="Hauptnavigation" data-sveltekit-preload-data="false" data-sveltekit-preload-code="viewport">
			<a href="/" aria-current={path === '/' ? 'page' : undefined}><Icon name="home" /><span>Übersicht</span></a>
			{#each learnerItems as item (item.href)}
				<a href={item.href} aria-current={path.startsWith(item.href) ? 'page' : undefined}><Icon name={item.icon} /><span>{item.label}</span></a>
			{/each}
		</nav>
		{#if data.profile.role === 'admin'}
			<div class="admin-area"><span>Administration</span><a href="/admin" aria-current={path.startsWith('/admin') ? 'page' : undefined}><Icon name="admin" /><b>Verwaltung</b></a></div>
		{/if}
		<a class="settings-link" href="/einstellungen" aria-current={path.startsWith('/einstellungen') ? 'page' : undefined}><Icon name="settings" /><span>Einstellungen</span></a>
	</aside>

	<div class="workspace">
		<header class="topbar">
			<div><span class="mobile-mark">A</span><div><small>AbiPro</small><strong>{pageTitle}</strong></div></div>
			<div class="top-actions">
				<span class="sync"><i></i><span>Alles synchronisiert</span></span>
				<details class="profile-menu">
					<summary aria-label="Profilmenü öffnen"><span class="avatar">{initials}</span><span class="profile-name">{data.profile.displayName ?? 'Lernprofil'}</span><Icon name="chevron" size={16} /></summary>
					<div><a href="/einstellungen"><Icon name="settings" size={18} />Einstellungen</a><form method="POST" action="/logout"><button type="submit">Abmelden</button></form></div>
				</details>
			</div>
		</header>
		<div class="content">{@render children()}</div>
	</div>

	<nav class="bottom-nav" aria-label="Mobile Hauptnavigation" data-sveltekit-preload-data="false" data-sveltekit-preload-code="viewport">
		{#each learnerItems as item (item.href)}
			<a href={item.href} aria-current={path.startsWith(item.href) ? 'page' : undefined}><Icon name={item.icon} /><span>{item.label}</span></a>
		{/each}
	</nav>
</div>

<style>
	.app-shell { min-height: 100vh; }
	.sidebar { position: fixed; z-index: 20; inset: 0 auto 0 0; display: flex; width: var(--sidebar-width); flex-direction: column; padding: var(--space-5) var(--space-3); border-right: 1px solid #284239; background: #122b23; color: white; }
	.brand { display: flex; min-height: 3rem; align-items: center; gap: var(--space-3); padding: 0 var(--space-3); color: white; text-decoration: none; font-size: 1.15rem; }
	.brand > span, .mobile-mark { display: grid; width: 2rem; height: 2rem; place-items: center; border-radius: .55rem; background: #f5a35f; color: #42200b; font-family: var(--font-display); font-weight: 700; }
	.sidebar nav { display: grid; gap: var(--space-1); margin-top: var(--space-8); }
	.sidebar a:not(.brand) { display: flex; min-height: 2.75rem; align-items: center; gap: var(--space-3); padding: .65rem .8rem; border-radius: var(--radius-md); color: #c8d7d1; font-size: .9rem; font-weight: 600; text-decoration: none; }
	.sidebar a:not(.brand):hover { background: rgb(255 255 255 / .07); color: white; }
	.sidebar a[aria-current='page'] { background: #e3f4eb; color: #103d2d; }
	.admin-area { margin-top: auto; padding-top: var(--space-4); border-top: 1px solid rgb(255 255 255 / .12); }
	.admin-area > span { display: block; padding: 0 .8rem var(--space-2); color: #86a398; font-size: .68rem; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; }
	.admin-area b { font-weight: 600; }
	.settings-link { margin-top: var(--space-2); }
	.workspace { min-height: 100vh; margin-left: var(--sidebar-width); }
	.topbar { position: sticky; z-index: 15; top: 0; display: flex; min-height: var(--topbar-height); align-items: center; justify-content: space-between; gap: var(--space-4); padding: 0 var(--space-6); border-bottom: 1px solid var(--color-border); background: rgb(255 255 255 / .92); backdrop-filter: blur(12px); }
	.topbar > div, .top-actions, .profile-menu summary { display: flex; align-items: center; gap: var(--space-3); }
	.topbar small { display: block; color: var(--color-muted); font-size: .7rem; }
	.topbar strong { display: block; font-size: .95rem; }
	.mobile-mark { display: none; }
	.sync { display: flex; align-items: center; gap: var(--space-2); color: var(--color-muted); font-size: .78rem; }
	.sync i { width: .45rem; height: .45rem; border-radius: 50%; background: #24936c; box-shadow: 0 0 0 3px var(--color-brand-soft); }
	.profile-menu { position: relative; padding: 0; border: 0; background: transparent; }
	.profile-menu summary { min-height: 2.75rem; padding: .25rem; border-radius: var(--radius-md); cursor: pointer; list-style: none; }
	.profile-menu summary::-webkit-details-marker { display: none; }
	.avatar { display: grid; width: 2.35rem; height: 2.35rem; place-items: center; border-radius: 50%; background: var(--color-brand-soft); color: var(--color-brand-strong); font-size: .75rem; font-weight: 800; }
	.profile-name { max-width: 10rem; overflow: hidden; font-size: .82rem; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
	.profile-menu > div { position: absolute; top: calc(100% + .5rem); right: 0; display: grid; width: 13rem; padding: var(--space-2); border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-surface); box-shadow: var(--shadow-md); }
	.profile-menu > div a, .profile-menu button { display: flex; min-height: 2.75rem; align-items: center; gap: var(--space-2); padding: .65rem .75rem; border: 0; border-radius: var(--radius-sm); background: transparent; color: var(--color-ink); font-size: .85rem; font-weight: 600; text-decoration: none; }
	.profile-menu form { display: block; }
	.profile-menu button { width: 100%; justify-content: flex-start; }
	.profile-menu > div a:hover, .profile-menu button:hover { background: var(--color-surface-soft); }
	.bottom-nav { display: none; }
	:global(.content > main) { max-width: 76rem; }
	@media (max-width: 59.99rem) {
		.sidebar { width: 5rem; align-items: center; }
		.brand { padding: 0; }
		.brand strong, .sidebar a:not(.brand) span, .admin-area > span, .admin-area b { display: none; }
		.sidebar a:not(.brand) { justify-content: center; }
		.workspace { margin-left: 5rem; }
	}
	@media (max-width: 47.99rem) {
		.sidebar { display: none; }
		.workspace { margin-left: 0; }
		.topbar { min-height: 3.75rem; padding: 0 var(--space-3); }
		.mobile-mark { display: grid; }
		.topbar small, .sync span, .profile-name, .profile-menu summary :global(svg) { display: none; }
		.bottom-nav { position: fixed; z-index: 30; inset: auto 0 0; display: grid; grid-template-columns: repeat(4, 1fr); padding: .35rem .35rem max(.35rem, env(safe-area-inset-bottom)); border-top: 1px solid var(--color-border); background: rgb(255 255 255 / .97); box-shadow: 0 -8px 24px rgb(23 55 43 / .08); }
		.bottom-nav a { display: flex; min-height: 3.5rem; flex-direction: column; align-items: center; justify-content: center; gap: .2rem; border-radius: var(--radius-md); color: var(--color-muted); font-size: .67rem; font-weight: 700; text-decoration: none; }
		.bottom-nav a[aria-current='page'] { background: var(--color-brand-soft); color: var(--color-brand-strong); }
	}
</style>
