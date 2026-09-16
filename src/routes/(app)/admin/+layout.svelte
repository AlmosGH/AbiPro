<script lang="ts">
	import { page } from '$app/state';
	import type { LayoutProps } from './$types';
	let { children }: LayoutProps = $props();
	const items = [{ href: '/admin', label: 'Überblick' }, { href: '/admin/aufgaben', label: 'Aufgaben' }, { href: '/admin/assets', label: 'Assets' }, { href: '/admin/stammdaten', label: 'Stammdaten' }];
</script>

<nav class="admin-nav" aria-label="Administration">{#each items as item (item.href)}<a href={item.href} aria-current={page.url.pathname === item.href || (item.href !== '/admin' && page.url.pathname.startsWith(item.href)) ? 'page' : undefined}>{item.label}</a>{/each}</nav>
{@render children()}

<style>
	.admin-nav { display: flex; gap: var(--space-1); overflow-x: auto; padding: var(--space-3) max(var(--space-4), calc((100% - 76rem) / 2)); border-bottom: 1px solid var(--color-border); background: #fff8f0; }
	.admin-nav a { min-height: 2.5rem; padding: .6rem .9rem; border-radius: var(--radius-md); color: #764318; font-size: .82rem; font-weight: 700; text-decoration: none; white-space: nowrap; }
	.admin-nav a:hover { background: var(--color-accent-soft); }
	.admin-nav a[aria-current='page'] { background: #7c451c; color: white; }
</style>
