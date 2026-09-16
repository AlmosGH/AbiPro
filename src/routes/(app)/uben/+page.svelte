<script lang="ts">
	import type { PageProps } from './$types';
	let { data, form }: PageProps = $props();
</script>

<svelte:head><title>Üben – AbiPro</title></svelte:head>
<main>
	<h1>Üben</h1>
	<p>Starte eine zufällig ausgewählte veröffentlichte Aufgabe oder setze eine unterbrochene Übung fort.</p>

	{#if data.resumableAttempts.length}
		<section>
			<h2>Unterbrochene Übung fortsetzen</h2>
			<ul>
				{#each data.resumableAttempts as attempt (attempt.id)}
					<li><a href={`/uben/${attempt.id}`}>{attempt.title}</a> · begonnen am {attempt.startedAt.toLocaleString('de-DE')}</li>
				{/each}
			</ul>
		</section>
	{/if}

	<section>
		<h2>{data.requestedTaskSlug ? 'Ausgewählte Aufgabe üben' : 'Neue Übung'}</h2>
		{#if data.requestedTaskSlug}<p>Aufgabe: <strong>{data.requestedTaskSlug}</strong></p>{/if}
		{#if form?.message}<p role="alert">{form.message}</p>{/if}
		<form method="POST" action="?/start">
			<input type="hidden" name="taskSlug" value={data.requestedTaskSlug ?? ''} />
			{#if !data.requestedTaskSlug}
				<label>Lehrplan
					<select name="curriculumId"><option value="">Alle</option>{#each data.curricula as item (item.id)}<option value={item.id}>{item.name}</option>{/each}</select>
				</label>
				<label>Epoche
					<select name="periodId"><option value="">Alle</option>{#each data.periods as item (item.id)}<option value={item.id}>{item.name}</option>{/each}</select>
				</label>
				<label>Thema
					<select name="topicId"><option value="">Alle</option>{#each data.topics as item (item.id)}<option value={item.id} selected={data.requestedTopicId === item.id}>{item.name}</option>{/each}</select>
				</label>
				<label><input type="checkbox" name="onlyNotPracticed" /> Nur noch nicht geübte Aufgaben</label>
			{/if}
			<button>Übung starten</button>
		</form>
	</section>
</main>
