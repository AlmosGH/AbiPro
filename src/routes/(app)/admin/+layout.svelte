<script lang="ts">
	import type { LayoutProps } from './$types';
	let { children }: LayoutProps = $props();
</script>

<nav class="admin-nav" aria-label="Administration"><a href="/admin">Überblick</a><a href="/admin/aufgaben">Aufgaben</a><a href="/admin/assets">Assets</a><a href="/admin/stammdaten">Stammdaten</a></nav>
{@render children()}
