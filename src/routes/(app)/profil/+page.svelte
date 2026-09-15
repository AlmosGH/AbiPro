<script lang="ts">
	import type { PageProps } from './$types';
	let { data, form }: PageProps = $props();
	const percent = (value: number | null) => value === null ? '–' : `${value} %`;
</script>

<svelte:head><title>Profil – AbiPro</title></svelte:head>
<main>
	<h1>Profil und Lernfortschritt</h1>
	<form method="POST" action="?/updateName"><label>Anzeigename <input name="displayName" value={data.profile.displayName ?? ''} maxlength="80" required /></label> <button>Speichern</button></form>
	{#if form?.message}<p role="alert">{form.message}</p>{/if}
	<section aria-labelledby="overview"><h2 id="overview">Übersicht</h2><div class="stats-grid"><article><strong>{data.progress.overview.practiceCompleted}</strong><span>Übungsaufgaben abgeschlossen</span></article><article><strong>{data.progress.overview.mockExamsCompleted}</strong><span>Probeprüfungen abgeschlossen</span></article><article><strong>{percent(data.progress.overview.averagePercent)}</strong><span>Durchschnitt (bewertet)</span></article><article><strong>{percent(data.progress.overview.bestPercent)}</strong><span>Bestes Ergebnis</span></article></div>{#if data.progress.overview.pendingAi}<p>{data.progress.overview.pendingAi} Versuch(e) warten auf KI- oder Selbstbewertung und sind nicht im Durchschnitt enthalten.</p>{/if}</section>
	<section><h2>Letzte Aktivitäten</h2>{#if data.progress.recent.length}<ul>{#each data.progress.recent as attempt (attempt.id)}<li><a href={`/profil/versuche/${attempt.id}`}>{attempt.title}</a> · {attempt.kind === 'practice' ? 'Übung' : 'Probeprüfung'} · {attempt.status === 'graded' ? `${attempt.score} / ${attempt.maxScore} Punkte` : 'Bewertung ausstehend'}</li>{/each}</ul>{:else}<p>Noch keine abgegebenen Versuche.</p>{/if}</section>
	<section><h2>Nach Epoche</h2>{#if data.progress.periods.length}<table><thead><tr><th>Epoche</th><th>Versuche</th><th>Ø bewertet</th></tr></thead><tbody>{#each data.progress.periods as row (row.name)}<tr><td>{row.name}</td><td>{row.attempts}</td><td>{percent(row.averagePercent)}</td></tr>{/each}</tbody></table>{:else}<p>Noch keine Daten.</p>{/if}</section>
	<section><h2>Nach Thema</h2>{#if data.progress.topics.length}<table><thead><tr><th>Thema</th><th>Versuche</th><th>Ø bewertet</th></tr></thead><tbody>{#each data.progress.topics as row (row.name)}<tr><td>{row.name}</td><td>{row.attempts}</td><td>{percent(row.averagePercent)}</td></tr>{/each}</tbody></table>{:else}<p>Noch keine Daten.</p>{/if}</section>
	<section><h2>Kontodaten</h2><p><a href="/profil/export">Meine Daten als JSON exportieren</a></p><details><summary>Konto und alle Lerndaten löschen</summary><form method="POST" action="?/deleteAccount"><p>Diese Aktion ist endgültig. Gib <strong>LÖSCHEN</strong> ein.</p><label>Bestätigung <input name="confirmation" autocomplete="off" required /></label> <button class="danger">Konto endgültig löschen</button></form></details></section>
	<section><h2>Berechnungsregeln</h2><p>„Abgeschlossen“ zählt nur abgegebene oder vollständig bewertete Versuche. Durchschnitt und Bestwert verwenden nur vollständig bewertete Versuche; ausstehende KI-Bewertungen werden separat gezeigt. „Bestes“ vergleicht alle bewerteten Versuche, während die Aktivitätsliste den neuesten Versuch zeigt. Historische Versuche behalten ihre damals verwendete Aufgabenversion und bleiben auch bei archivierten Aufgaben oder zurückgezogenen Versionen sichtbar.</p></section>
</main>
