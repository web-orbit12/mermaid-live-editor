<script lang="ts">
  import Card from '$/components/Card/Card.svelte';
  import { Button } from '$/components/ui/button';
  import { getSampleDiagrams } from '$/util/mermaid';
  import { updateCode } from '$lib/util/state';
  import { logEvent } from '$lib/util/stats';
  import ShapesIcon from '~icons/material-symbols/account-tree-outline-rounded';

  interface Props {
    onclose?: () => void;
  }

  let { onclose }: Props = $props();

  const samples = getSampleDiagrams();
  const loadSampleDiagram = (diagramType: string): void => {
    updateCode(samples[diagramType], {
      resetPanZoom: true,
      updateDiagram: true
    });
    logEvent('loadSampleDiagram', { diagramType });
  };

  const mainDiagrams = [
    'Flowchart',
    'Class',
    'Sequence',
    'Entity Relationship',
    'State',
    'Mindmap'
  ];

  const diagramOrder = [
    ...mainDiagrams,
    ...Object.keys(samples)
      .filter((key) => !mainDiagrams.includes(key))
      .sort()
  ];
</script>

<Card title="Sample Diagrams" isOpen isStackable icon={{ component: ShapesIcon }} {onclose}>
  <div class="flex h-fit flex-wrap gap-2 p-2">
    {#each diagramOrder as sample (sample)}
      <Button
        size="sm"
        class="w-fit min-w-20 flex-grow normal-case"
        onclick={() => loadSampleDiagram(sample)}>
        {sample}
      </Button>
    {/each}
  </div>
</Card>
