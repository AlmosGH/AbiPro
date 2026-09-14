<script lang="ts">
	import type { EditableSource } from '$lib/types/admin';

	interface Asset { id: number; altText: string | null; mimeType: string; signedUrl: string | null }
	interface Props { source: EditableSource; index: number; total: number; assets: Asset[]; onchange: () => void; onmove: (direction: -1 | 1) => void; onduplicate: () => void; onremove: () => void }
	let { source = $bindable(), index, total, assets, onchange, onmove, onduplicate, onremove }: Props = $props();

	function addColumn() { source.headers.push(`Spalte ${source.headers.length + 1}`); for (const row of source.rows) row.push(''); onchange(); }
	function removeColumn(column: number) { if (source.headers.length <= 1) return; source.headers.splice(column, 1); for (const row of source.rows) row.splice(column, 1); onchange(); }
	function addRow() { source.rows.push(source.headers.map(() => '')); onchange(); }
</script>

<article>
	<h3>Quelle {index + 1}</h3>
	<p><button type="button" onclick={() => onmove(-1)} disabled={index === 0}>Nach oben</button> <button type="button" onclick={() => onmove(1)} disabled={index === total - 1}>Nach unten</button> <button type="button" onclick={onduplicate}>Duplizieren</button> <button type="button" onclick={onremove}>Entfernen</button></p>
	<p><label>Typ <select bind:value={source.kind}><option value="text">Text</option><option value="image">Bild</option><option value="table">Tabelle</option><option value="map">Karte</option></select></label></p>
	<p><label>Titel <input bind:value={source.title} /></label></p>
	{#if source.kind === 'text'}
		<p><label>Quellentext <textarea bind:value={source.text} rows="8" required></textarea></label></p>
	{:else if source.kind === 'image' || source.kind === 'map'}
		<p><label>Asset <select bind:value={source.assetId}><option value={null}>Kein privates Asset</option>{#each assets.filter((asset) => asset.mimeType.startsWith('image/')) as asset (asset.id)}<option value={asset.id}>{asset.altText || asset.id} ({asset.mimeType})</option>{/each}</select></label></p>
		<p><label>Öffentliche Bild-URL <input bind:value={source.publicUrl} placeholder="/test-data/beispiel.png" /></label></p>
		{#if !assets.some((asset) => asset.mimeType.startsWith('image/'))}<p role="alert">Noch keine Bild-Assets vorhanden. <a href="/admin/assets">Asset hochladen</a>.</p>{/if}
		{@const selected = assets.find((asset) => asset.id === source.assetId)}
		{#if selected?.signedUrl && selected.mimeType.startsWith('image/')}<img src={selected.signedUrl} alt={selected.altText ?? ''} />{:else if source.publicUrl}<img src={source.publicUrl} alt={source.title} />{/if}
	{:else}
		<h4>Spalten</h4>
		{#each source.headers as header, column (`${source.clientId}-header-${column}`)}<p><label>Spalte {column + 1} <input bind:value={source.headers[column]} required /></label> <button type="button" onclick={() => removeColumn(column)} disabled={source.headers.length <= 1}>Spalte entfernen</button></p>{/each}
		<p><button type="button" onclick={addColumn}>Spalte hinzufügen</button></p>
		<h4>Zeilen</h4>
		{#each source.rows as row, rowIndex (`${source.clientId}-row-${rowIndex}`)}<fieldset><legend>Zeile {rowIndex + 1}</legend>{#each row as _cell, column (`${source.clientId}-cell-${rowIndex}-${column}`)}<label>{source.headers[column] || `Spalte ${column + 1}`} <input bind:value={source.rows[rowIndex][column]} /></label>{/each}<button type="button" onclick={() => { source.rows.splice(rowIndex, 1); onchange(); }} disabled={source.rows.length <= 1}>Zeile entfernen</button></fieldset>{/each}
		<p><button type="button" onclick={addRow}>Zeile hinzufügen</button></p>
	{/if}
</article>
