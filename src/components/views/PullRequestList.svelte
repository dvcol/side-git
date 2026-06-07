<script lang="ts">
  import { createQuery } from '@tanstack/svelte-query';

  import { myPullRequestsQueryOptions } from '~/services/github-queries';

  // Mounted only when authenticated (see PullRequestsComponent), so the query can run eagerly.
  const prs = createQuery(myPullRequestsQueryOptions());
</script>

<div class="pr-list">
  {#if $prs.isPending}
    <div class="muted">Loading pull requests…</div>
  {:else if $prs.isError}
    <div class="error">Failed to load pull requests: {$prs.error.message}</div>
  {:else if !$prs.data?.length}
    <div class="muted">No pull requests authored by you.</div>
  {:else}
    <div class="muted">{$prs.data.length} pull request{$prs.data.length === 1 ? '' : 's'}</div>
    <ul>
      {#each $prs.data as pr (pr.id)}
        <li>
          <a href={pr.htmlUrl} target="_blank" rel="noreferrer" class="title">{pr.title}</a>
          <div class="meta">
            <span class="repo">{pr.repository}</span>
            <span class="number">#{pr.number}</span>
            <span class="state state-{pr.state}">{pr.draft ? 'draft' : pr.state}</span>
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style lang="scss">
  .pr-list {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    gap: 0.5rem;
    width: 100%;
    overflow-y: auto;
  }

  .muted {
    color: #888;
    font-size: 0.85rem;
  }

  .error {
    color: #e5534b;
    font-size: 0.85rem;
  }

  ul {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  li {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: 0.5rem 0.75rem;
    border: 1px solid rgb(255 255 255 / 10%);
    border-radius: 0.5rem;
  }

  .title {
    color: inherit;
    font-weight: 600;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }

  .meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    color: #888;
    font-size: 0.8rem;
  }

  .state {
    text-transform: capitalize;
  }

  .state-open {
    color: #3fb950;
  }

  .state-closed {
    color: #f85149;
  }
</style>
