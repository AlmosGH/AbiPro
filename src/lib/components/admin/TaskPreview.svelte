<script lang="ts">
	import type { EditableQuestion, EditableSource } from '$lib/types/admin';
	interface Asset { id: number; altText: string | null; mimeType: string; signedUrl: string | null }
	interface Props { title: string; instructions: string; maxPoints: number; sources: EditableSource[]; questions: EditableQuestion[]; assets: Asset[] }
	let { title, instructions, maxPoints, sources, questions, assets }: Props = $props();
</script>

<section>
	<h2>Live-Vorschau</h2><h3>{title || 'Unbenannte Aufgabe'}</h3><p>{maxPoints || 0} Punkte</p>{#if instructions}<p>{instructions}</p>{/if}
	<h3>Quellen</h3>{#each sources as source, index (source.clientId)}<article><h4>{source.title || `Quelle ${index + 1}`}</h4>{#if source.kind === 'text'}<p>{source.text}</p>{:else if source.kind === 'table'}<table><thead><tr>{#each source.headers as header, column (`${source.clientId}-preview-header-${column}`)}<th>{header}</th>{/each}</tr></thead><tbody>{#each source.rows as row, rowIndex (`${source.clientId}-preview-row-${rowIndex}`)}<tr>{#each row as cell, column (`${source.clientId}-preview-cell-${rowIndex}-${column}`)}<td>{cell}</td>{/each}</tr>{/each}</tbody></table>{:else}{@const asset = assets.find((item) => item.id === source.assetId)}{#if asset?.signedUrl && asset.mimeType.startsWith('image/')}<img src={asset.signedUrl} alt={asset.altText ?? source.title} />{:else if source.publicUrl}<img src={source.publicUrl} alt={source.title} />{:else}<p>Kein darstellbares Bild ausgewählt.</p>{/if}{/if}</article>{/each}
	<h3>Fragen</h3><ol>{#each questions as question (question.clientId)}<li><p>{question.prompt || 'Fragetext fehlt'} ({question.maxPoints || 0} P.)</p>{#if question.kind === 'choice' || question.kind === 'multiple_choice'}<ul>{#each question.options as option (`${question.clientId}-${option.id}`)}<li>{option.label || option.id}</li>{/each}</ul>{:else if question.kind === 'matching'}<p>{question.left.map((item) => item.label || item.id).join(', ')} ↔ {question.right.map((item) => item.label || item.id).join(', ')}</p>{:else if question.kind === 'ordering'}<ol>{#each question.items as item (`${question.clientId}-${item.id}`)}<li>{item.label || item.id}</li>{/each}</ol>{:else}<p>{question.multiline ? 'Mehrzeilige' : 'Kurze'} Freitextantwort</p>{/if}</li>{/each}</ol>
</section>
