<script lang="ts">
  import type { AppProps } from '~/components/app.model';

  import { NeoPortalContainer } from '@dvcol/neo-svelte/floating';
  import { NeoLazy, NeoSuspense } from '@dvcol/neo-svelte/loading';
  import { NeoThemeProvider } from '@dvcol/neo-svelte/providers';
  import { onMount } from 'svelte';

  import { Logger } from '~/services/logger.service';
  import { initServices } from '~/web/init-services';

  const { baseUrl, view }: AppProps = $props();

  onMount(() => {
    Logger.info('baseUrl:', baseUrl);
  });

</script>

<NeoThemeProvider>
  <NeoPortalContainer>
    <NeoSuspense promise={initServices(view)}>
      <NeoLazy component={import('~/components/header/HeaderComponent.svelte')} />
      <NeoLazy component={import('~/components/main/MainComponent.svelte')} />
    </NeoSuspense>
  </NeoPortalContainer>
</NeoThemeProvider>
