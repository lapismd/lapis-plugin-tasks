<script lang="ts">
  import "./ReferenceMarkdownPreview.css";

  let {
    value = "",
    empty = "",
    compact = false,
  }: {
    value?: string;
    empty?: string;
    compact?: boolean;
    collapsedMaxHeight?: number;
    expandLabel?: string;
    collapseLabel?: string;
    floatingToc?: string;
  } = $props();

  const lines = $derived(
    value
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
  );
</script>

<div
  class="reference-markdown-preview"
  class:reference-markdown-preview--compact={compact}
  data-ui-component="reference-markdown-preview"
>
  {#if lines.length}
    {#each lines as line, index (`${index}:${line}`)}
      <p>{line.replace(/^[-*]\s+/, "")}</p>
    {/each}
  {:else}
    <p class="reference-markdown-preview__empty">{empty}</p>
  {/if}
</div>
