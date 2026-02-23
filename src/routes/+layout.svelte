<script lang="ts">
  import '../app.css';
  let { children } = $props();
</script>

<svelte:head>
  <title>Scoreboard</title>
  <meta name="description" content="Real-time scoreboard for your games" />
</svelte:head>

<main>
  {@render children()}
</main>
