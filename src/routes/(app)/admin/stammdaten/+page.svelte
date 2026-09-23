<script lang="ts">
	import type { PageProps } from './$types';
	let { data, form }: PageProps = $props();
</script>

<svelte:head><title>Stammdaten – Administration – AbiPro</title></svelte:head>
<main>
	<p><a href="/admin">Administration</a></p><h1>Stammdaten</h1>
	{#if form?.message}<p role="status">{form.message}</p>{/if}
	<section><h2>Lehrpläne</h2><form method="POST" action="?/saveCurriculum"><label>Code <input name="code" required /></label><label>Name <input name="name" required /></label><button>Hinzufügen</button></form>{#each data.curricula as item (item.id)}<form method="POST" action="?/saveCurriculum"><input type="hidden" name="id" value={item.id} /><label>Code <input name="code" value={item.code} required /></label><label>Name <input name="name" value={item.name} required /></label><button>Speichern</button><button formaction="?/deleteCurriculum">Löschen</button></form>{/each}</section>
	<section><h2>Epochen</h2><p>Die Epochen entsprechen der offiziellen Prüfungsbeschreibung.</p><ul>{#each data.periods as item (item.id)}<li>{item.name}</li>{/each}</ul></section>
	<section><h2>Themen</h2><p>Die Themen entsprechen der offiziellen Prüfungsbeschreibung.</p><ul>{#each data.topics as item (item.id)}<li>{item.name}</li>{/each}</ul></section>
	<section><h2>Prüfungstermine</h2><form method="POST" action="?/saveSession"><label>Jahr <input name="year" type="number" min="2000" max="2100" required /></label><label>Session <select name="session"><option value="spring">Frühjahr</option><option value="autumn">Herbst</option></select></label><label>Offizieller Code <input name="officialCode" /></label><button>Hinzufügen</button></form>{#each data.sessions as item (item.id)}<form method="POST" action="?/saveSession"><input type="hidden" name="id" value={item.id} /><label>Jahr <input name="year" type="number" value={item.year} required /></label><label>Session <select name="session" value={item.session}><option value="spring">Frühjahr</option><option value="autumn">Herbst</option></select></label><label>Offizieller Code <input name="officialCode" value={item.officialCode ?? ''} /></label><button>Speichern</button><button formaction="?/deleteSession">Löschen</button></form>{/each}</section>
</main>
