import { QueryClient } from '@tanstack/svelte-query';

/**
 * Shared singleton QueryClient. Provided to the component tree via
 * `<QueryClientProvider>` in App.svelte and reused by query/mutation factories.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // GitHub data is fine to serve briefly stale; avoid refetch storms in a panel.
      staleTime: 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
