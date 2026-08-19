<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import { CatalogBoundaryExample } from "./catalog.example-sources";

  import CatalogBoundary from "./CatalogBoundary.svelte";

  const { Story } = defineMeta({
    title: "Plugins/Tasks/Overview/Catalog Boundary",
    component: CatalogBoundary,
    tags: ["visual-pending"],
    parameters: {
      docs: {
        source: {
          code: CatalogBoundaryExample,
          language: "svelte",
          type: "code",
        },
        description: {
          component: "Catalog-first boundary copy for the stub Tasks plugin.",
          story: "Catalog boundary copy for the stub Tasks plugin.",
        },
      },
    },
  });
</script>

<Story name="Reference only" />
