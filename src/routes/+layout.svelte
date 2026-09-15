<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
<a class="skip-link" href="#main-content">Zum Inhalt springen</a>
<div id="main-content">{@render children()}</div>
<footer class="site-footer">
	<div class="footer-inner">
		<div>
			<strong><span aria-hidden="true">❦</span> AbiPro v1</strong>
			<p>Copyright Álmos 2026</p>
		</div>
		<nav aria-label="Rechtliches"><a href="/datenschutz">Datenschutz</a><a href="/impressum">Impressum</a><a href="/ki-bewertung">KI-Bewertung</a></nav>
	</div>
</footer>
