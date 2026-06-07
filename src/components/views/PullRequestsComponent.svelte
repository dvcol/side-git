<script lang="ts">
  import type { GithubDeviceCodeResponse } from '~/models/github.model';

  import { NeoButton } from '@dvcol/neo-svelte/buttons';
  import { createMutation } from '@tanstack/svelte-query';

  import PullRequestList from '~/components/views/PullRequestList.svelte';
  import { GithubAuthStrategy } from '~/models/github.model';
  import { DEVICE_VERIFICATION_URL } from '~/services/auth/github-oauth.config';
  import { GithubAuthService } from '~/services/github-auth.service';
  import { loginMutationOptions, logoutMutationOptions } from '~/services/github-queries';
  import { GithubAuthStore } from '~/stores/github-auth.store.svelte';
  import { createTab } from '~/utils/browser/browser.utils';

  const login = createMutation(loginMutationOptions());
  const logout = createMutation(logoutMutationOptions());

  // Device-flow user code surfaced while the user authorizes in another tab.
  let deviceInfo = $state<GithubDeviceCodeResponse>();

  const canUseWebFlow = GithubAuthService.canUseWebFlow;

  function onWebLogin() {
    deviceInfo = undefined;
    $login.mutate({ strategy: GithubAuthStrategy.Web });
  }

  function onDeviceLogin() {
    $login.mutate({
      strategy: GithubAuthStrategy.Device,
      onUserCode: (info) => {
        deviceInfo = info;
        // Open the verification page so the user only needs to paste the code.
        createTab({ url: info.verification_uri || DEVICE_VERIFICATION_URL });
      },
    });
  }

  function onLogout() {
    deviceInfo = undefined;
    $logout.mutate();
  }
</script>

<section class="github-prs">
  {#if GithubAuthStore.isAuthenticated}
    <header>
      <span class="who">
        {#if GithubAuthStore.user?.avatarUrl}
          <img src={GithubAuthStore.user.avatarUrl} alt="" class="avatar" />
        {/if}
        <span>{GithubAuthStore.user?.name ?? GithubAuthStore.user?.login ?? 'Signed in'}</span>
      </span>
      <NeoButton onclick={onLogout} loading={$logout.isPending}>Logout</NeoButton>
    </header>

    <PullRequestList />
  {:else}
    <div class="login">
      <h2>Connect your GitHub account</h2>

      {#if canUseWebFlow}
        <NeoButton onclick={onWebLogin} loading={$login.isPending && !deviceInfo}>Login with GitHub</NeoButton>
        <button class="link" type="button" onclick={onDeviceLogin} disabled={$login.isPending}>Use a device code instead</button>
      {:else}
        <NeoButton onclick={onDeviceLogin} loading={$login.isPending}>Login with a device code</NeoButton>
      {/if}

      {#if deviceInfo}
        <div class="device">
          <p>Enter this code at <a href={deviceInfo.verification_uri} target="_blank" rel="noreferrer">{deviceInfo.verification_uri}</a>:</p>
          <code class="user-code">{deviceInfo.user_code}</code>
          <p class="muted">Waiting for authorization…</p>
        </div>
      {/if}

      {#if $login.isError}
        <p class="error">{$login.error.message}</p>
      {/if}
    </div>
  {/if}
</section>

<style lang="scss">
  .github-prs {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    gap: 1rem;
    box-sizing: border-box;
    width: 100%;
    height: 100%;
    padding: 1rem;
  }

  header {
    display: flex;
    gap: 1rem;
    align-items: center;
    justify-content: space-between;
  }

  .who {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    font-weight: 600;
  }

  .avatar {
    width: 1.5rem;
    height: 1.5rem;
    border-radius: 50%;
  }

  .login {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    gap: 1rem;
    align-items: center;
    justify-content: center;
    text-align: center;
  }

  .link {
    color: #58a6ff;
    font: inherit;
    background: none;
    border: none;
    cursor: pointer;

    &:disabled {
      color: #888;
      cursor: default;
    }
  }

  .device {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    align-items: center;
  }

  .user-code {
    padding: 0.5rem 1rem;
    font-size: 1.5rem;
    letter-spacing: 0.25rem;
    background: rgb(255 255 255 / 10%);
    border-radius: 0.5rem;
  }

  .muted {
    color: #888;
    font-size: 0.85rem;
  }

  .error {
    color: #e5534b;
    font-size: 0.85rem;
  }
</style>
