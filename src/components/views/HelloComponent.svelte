<script lang="ts">
  import { useI18n } from '~/utils/i18n.utils';

  const i18n = useI18n('hello');
</script>

<div class="text">
  <div class="title">{i18n('app_name', 'global')}</div>
  <div>{i18n('title')}</div>
</div>

<style lang="scss">
  .text {
    display: flex;
    flex-direction: column;
    align-items: center;
    align-self: center;
    justify-content: center;
    width: 100%;
    height: 100%;

    .title {
      margin-bottom: 2rem;
    }
  }
</style>
