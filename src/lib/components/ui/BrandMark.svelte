<script lang="ts">
	import mark from '$lib/assets/favicon.svg';

	let { size = 'default' }: { size?: 'small' | 'default' | 'large' } = $props();
</script>

<img src={mark} alt="" aria-hidden="true" class:small={size === 'small'} class:large={size === 'large'} />

<style>
	img { display: block; width: 2rem; height: 2rem; flex: 0 0 auto; filter: drop-shadow(0 2px 4px rgb(0 0 0 / .12)); }
	.small { width: 2rem; height: 2rem; }
	.large { width: 3rem; height: 3rem; margin: 0 auto .5rem; }
</style>
