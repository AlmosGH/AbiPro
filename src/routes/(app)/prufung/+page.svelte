<script lang="ts">
	import type { PageProps } from './$types';
	let { data, form }: PageProps = $props();
</script>

<svelte:head><title>Prüfung – AbiPro</title></svelte:head>
<main>
	<h1>Prüfung</h1>
	<p>Simuliere den offiziellen Kurzantwort-Teil der ungarischen Geschichtsprüfung auf Mittelstufe.</p>
	<dl>
		<div><dt>Aufgaben</dt><dd>{data.config.taskCount}</dd></div>
		<div><dt>Zeit</dt><dd>{data.config.timeLimitSeconds / 60} Min.</dd></div>
		<div><dt>Maximal</dt><dd>{data.config.targetMaximumScore} P.</dd></div>
	</dl>

	{#if data.activeAttempt}
		<section>
			<h2>Laufende Prüfung</h2>
			<p>Deine Start- und Ablaufzeit sind serverseitig gespeichert. Ein Neuladen startet die Uhr nicht neu.</p>
			<p><a class="button-link" href={`/prufung/${data.activeAttempt.id}`}>Prüfung fortsetzen</a></p>
		</section>
	{:else if data.readiness.ready}
		<section>
			<h2>Neue Prüfung</h2>
			<p>Beim Start werden zwölf passende, unterschiedliche Aufgabenversionen ausgewählt und in dieser Reihenfolge gespeichert.</p>
			{#if form?.message}<p role="alert" class="save-error">{form.message}</p>{/if}
			<form method="POST" action="?/start"><button>Prüfung starten</button></form>
		</section>
	{:else}
		<section class="readiness-message" role="status">
			<h2>Prüfungsmodus noch nicht bereit</h2>
			<p>Der veröffentlichte Aufgabenpool erfüllt die offiziellen Regeln noch nicht. Die Vorgaben werden nicht automatisch gelockert.</p>
			<ul>
				{#each data.readiness.missingRules as rule (rule.position)}
					<li>Position {rule.position}: {rule.label} ({rule.maximumPoints} Punkte)</li>
				{/each}
			</ul>
		</section>
	{/if}
</main>
