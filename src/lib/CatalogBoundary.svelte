<script lang="ts">
  let {
    title = "Tasks UI reference catalog",
  }: {
    title?: string;
  } = $props();
</script>

<section class="catalog-boundary" data-ui-component="tasks-catalog-boundary">
  <p class="catalog-boundary__eyebrow">Catalog first</p>
  <h1>{title}</h1>
  <p>
    Components in this package are staged for review before a runtime UI
    registration contract is introduced.
  </p>
</section>
