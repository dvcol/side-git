<script lang="ts">
  import type { AppProps } from '~/components/app.model';

  import { NeoPortalContainer } from '@dvcol/neo-svelte/floating';
  import { NeoSuspense } from '@dvcol/neo-svelte/loading';
  import { NeoThemeProvider } from '@dvcol/neo-svelte/providers';
  import { QueryClientProvider } from '@tanstack/svelte-query';
  import { onMount } from 'svelte';

  import HeaderComponent from '~/components/header/HeaderComponent.svelte';
  import MainComponent from '~/components/main/MainComponent.svelte';
  import { Logger } from '~/services/logger.service';
  import { queryClient } from '~/services/query-client';
  import { initServices } from '~/web/init-services';

  const { baseUrl, view, root }: AppProps = $props();

  onMount(() => {
    Logger.info('app mount:', { baseUrl, root });
  });

</script>

<QueryClientProvider client={queryClient}>
  <NeoThemeProvider target={root}>
    <NeoPortalContainer>
      <NeoSuspense promise={initServices(view)}>
        <HeaderComponent />
        <MainComponent />
      </NeoSuspense>
    </NeoPortalContainer>
  </NeoThemeProvider>
</QueryClientProvider>
