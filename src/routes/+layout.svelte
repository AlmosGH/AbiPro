<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import { setContext } from 'svelte';
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import StatusCenter from '$lib/components/ui/StatusCenter.svelte';
	import { LANGUAGE_CONTEXT, translate, type LanguageContext, type Locale } from '$lib/i18n';
	import { getSocialMetadata } from '$lib/social';
	import type { LayoutProps } from './$types';
	import { injectSpeedInsights } from '@vercel/speed-insights/sveltekit';

	injectSpeedInsights();

	let { data, children }: LayoutProps = $props();
	function initialLocale(): Locale { return data.locale; }
	let locale = $state<Locale>(initialLocale());
	const social = $derived(getSocialMetadata(page.url.pathname, page.data, locale));
	const socialUrl = $derived(`${page.url.origin}${page.url.pathname}`);
	const socialImage = $derived(new URL('/social-preview.png', page.url.origin).href);
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

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="AbiPro" />
	<meta property="og:title" content={social.title} />
	<meta property="og:description" content={social.description} />
	<meta property="og:url" content={socialUrl} />
	<meta property="og:locale" content={locale === 'hu' ? 'hu_HU' : 'de_DE'} />
	<meta property="og:image" content={socialImage} />
	<meta property="og:image:type" content="image/png" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:image:alt" content={translate(locale, 'AbiPro Symbol auf grünem Hintergrund')} />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={social.title} />
	<meta name="twitter:description" content={social.description} />
	<meta name="twitter:image" content={socialImage} />
	<meta name="twitter:image:alt" content={translate(locale, 'AbiPro Symbol auf grünem Hintergrund')} />
</svelte:head>
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
