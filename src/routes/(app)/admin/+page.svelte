<script lang="ts">
	import type { PageProps } from './$types';
	let { data }: PageProps = $props();
</script>

<svelte:head><title>Administration – AbiPro</title></svelte:head>
<main>
	<h1>Administration</h1>
	<section><h2>Überblick</h2><dl><div><dt>Aufgaben</dt><dd>{data.counts.total}</dd></div><div><dt>Entwürfe</dt><dd>{data.counts.drafts}</dd></div><div><dt>Veröffentlicht</dt><dd>{data.counts.published}</dd></div><div><dt>Archiviert</dt><dd>{data.counts.archived}</dd></div></dl></section>
	<section><h2>Entwürfe mit offenen Punkten</h2>{#if data.problemDrafts.length}<ul>{#each data.problemDrafts as task (task.versionId)}<li><a href={`/admin/aufgaben/${task.versionId}`}>{task.title}</a><ul>{#each task.issues as issue (issue)}<li>{issue}</li>{/each}</ul></li>{/each}</ul>{:else}<p>Alle Entwürfe sind veröffentlichungsbereit.</p>{/if}</section>
	<section><h2>Zuletzt veröffentlichte Aufgaben</h2>{#if data.recentlyPublished.length}<ul>{#each data.recentlyPublished as task (task.versionId)}<li><a href={`/admin/aufgaben/${task.versionId}`}>{task.title}</a> (Version {task.version})</li>{/each}</ul>{:else}<p>Noch keine veröffentlichten Aufgaben.</p>{/if}</section>
</main>
