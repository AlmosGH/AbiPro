<script lang="ts">
	import { getLanguageContext, type Locale } from '$lib/i18n';

	const language = getLanguageContext();
</script>

<label class="language-picker">
	<span class="sr-only">{language.t('Sprache der Benutzeroberfläche')}</span>
	<select aria-label={language.t('Sprache der Benutzeroberfläche')} value={language.locale} onchange={(event) => language.setLocale(event.currentTarget.value as Locale)}>
		<option value="de">Deutsch</option>
		<option value="hu">Magyar</option>
	</select>
</label>

<style>
	.language-picker { display: inline-flex; margin: 0; }
	select { min-height: 2.5rem; padding: .35rem 2rem .35rem .7rem; border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-surface); color: var(--color-ink); font-size: .8rem; font-weight: 700; }
</style>
