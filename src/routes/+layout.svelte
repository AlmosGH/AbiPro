<script lang="ts">
	import { browser } from '$app/environment';
	import { setContext } from 'svelte';
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import StatusCenter from '$lib/components/ui/StatusCenter.svelte';
	import { LANGUAGE_CONTEXT, translate, type LanguageContext, type Locale } from '$lib/i18n';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();
	function initialLocale(): Locale { return data.locale; }
	let locale = $state<Locale>(initialLocale());
	const language: LanguageContext = {
		get locale() { return locale; },
		t: (key, values) => translate(locale, key, values),
		setLocale: (next) => {
			locale = next;
			if (browser) {
				const secure = window.location.protocol === 'https:' ? '; Secure' : '';
				document.cookie = `locale=${next}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
				document.documentElement.lang = next;
			}
		}
	};
	setContext(LANGUAGE_CONTEXT, language);
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
<a class="skip-link" href="#main-content">{language.t('Zum Inhalt springen')}</a>
<div id="main-content">{@render children()}</div>
<StatusCenter />
<footer class="site-footer">
	<div class="footer-inner">
		<div>
			<strong>AbiPro v1</strong>
			<p>Copyright Álmos 2026</p>
		</div>
		<nav aria-label={language.t('Rechtliches')}><a href="/datenschutz">{language.t('Datenschutz')}</a><a href="/impressum">{language.t('Impressum')}</a><a href="/ki-bewertung">{language.t('KI-Bewertung')}</a></nav>
	</div>
</footer>
