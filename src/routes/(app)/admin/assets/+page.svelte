<script lang="ts">
	import type { PageProps } from './$types';
	let { data, form }: PageProps = $props();
	function size(bytes: number) { return bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`; }
</script>

<svelte:head><title>Assets – Administration – AbiPro</title></svelte:head>
<main>
	<p><a href="/admin">Administration</a></p><h1>Assets</h1>
	{#if form?.message}<p role="status">{form.message}</p>{/if}
	{#if !data.storageConfigured}<p role="alert">Storage-Vorschauen sind nicht konfiguriert. Prüfe SUPABASE_SECRET_KEY.</p>{/if}
	<section><h2>Hochladen</h2><form method="POST" action="?/upload" enctype="multipart/form-data"><label>Datei <input name="file" type="file" accept="image/jpeg,image/png,image/webp,image/gif,application/pdf" required /></label><label>Alternativtext <input name="altText" /></label><button>Hochladen</button></form></section>
	<section><h2>Vorhandene Assets</h2>{#if data.assets.length}<ul>{#each data.assets as asset (asset.id)}<li><article><h3>{asset.altText || asset.path.split('/').at(-1)}</h3>{#if asset.signedUrl && asset.mimeType.startsWith('image/')}<img src={asset.signedUrl} alt={asset.altText ?? ''} />{:else if asset.signedUrl}<p><a href={asset.signedUrl} target="_blank" rel="noreferrer">Datei öffnen</a></p>{/if}<p>{asset.mimeType} · {size(asset.sizeBytes)} · {asset.usageCount} Verwendungen</p><form method="POST" action="?/update"><input type="hidden" name="id" value={asset.id} /><label>Alternativtext <input name="altText" value={asset.altText ?? ''} /></label><button>Metadaten speichern</button></form><form method="POST" action="?/replace" enctype="multipart/form-data"><input type="hidden" name="id" value={asset.id} /><input type="hidden" name="altText" value={asset.altText ?? ''} /><label>Datei ersetzen <input name="file" type="file" accept="image/jpeg,image/png,image/webp,image/gif,application/pdf" required /></label><button>Ersetzen</button></form><form method="POST" action="?/delete"><input type="hidden" name="id" value={asset.id} /><button disabled={asset.usageCount > 0}>Löschen</button>{#if asset.usageCount > 0}<small>Erst aus allen Aufgaben entfernen.</small>{/if}</form></article></li>{/each}</ul>{:else}<p>Noch keine Assets vorhanden.</p>{/if}</section>
</main>
