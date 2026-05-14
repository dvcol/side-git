<script lang="ts">
  import { RouterView } from '@dvcol/svelte-simple-router/components';
  import { transition } from '@dvcol/svelte-simple-router/utils';

  import svelteLogo from '~/assets/logo.svg';
  import { router } from '~/router/router';
  import { useI18n } from '~/utils/i18n.utils';

  const i18n = useI18n('home');
</script>

<main>
  <div>
    <a href="https://svelte.dev" target="_blank" rel="noreferrer">
      <img src={svelteLogo} class="logo svelte" alt="Svelte Logo" />
    </a>
  </div>
  <h1>{i18n('title')}</h1>

  <div class="view">
    <RouterView {router} {transition} />
  </div>

  <p>
    Check out <a href="https://github.com/sveltejs/kit#readme" target="_blank" rel="noreferrer">SvelteKit</a>, the official Svelte app framework
    powered by Vite!
  </p>

  <p class="read-the-docs">{i18n('learn_more')}</p>
</main>

<style lang="scss">
  main {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
  }

  .logo {
    height: 6em;
    padding: 1.5em;
    transition: filter 300ms;
    will-change: filter;
  }

  .view {
    min-height: 6rem;
    padding: 2rem;
  }

  .logo:hover {
    filter: drop-shadow(0 0 2em #646cffaa);
  }

  .logo.svelte:hover {
    filter: drop-shadow(0 0 2em #ff3e00aa);
  }

  .read-the-docs {
    color: #888;
  }
</style>
