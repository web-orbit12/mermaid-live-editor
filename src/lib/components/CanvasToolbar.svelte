<script lang="ts">
  import FloatingToolbar from '$/components/FloatingToolbar.svelte';
  import { Button } from '$/components/ui/button';
  import * as Popover from '$/components/ui/popover';
  import { Separator } from '$/components/ui/separator';
  import { Switch } from '$/components/ui/switch';
  import { updateCode } from '$/util/state';
  import { stateStore } from '$/util/state';
  import ArrowDownIcon from '~icons/material-symbols/arrow-downward-rounded';
  import ArrowUpIcon from '~icons/material-symbols/arrow-upward-rounded';
  import ArrowRightIcon from '~icons/material-symbols/arrow-forward-rounded';
  import ArrowLeftIcon from '~icons/material-symbols/arrow-back-rounded';
  import ShapesIcon from '~icons/material-symbols/category-outline-rounded';
  import ImageIcon from '~icons/material-symbols/image-outline-rounded';
  import TextIcon from '~icons/material-symbols/text-fields-rounded';
  import ChevronDownIcon from '~icons/material-symbols/keyboard-arrow-down-rounded';
  import OrgChartIcon from '~icons/material-symbols/account-tree-outline-rounded';

  const getNextNodeId = (code: string): string => {
    const matches = [...code.matchAll(/\bnode(\d+)\b/g)];
    const nums = matches.map((m) => parseInt(m[1], 10));
    const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
    return `node${next}`;
  };

  const insertNode = (template: (id: string) => string) => {
    shapesOpen = false;
    const code = $stateStore.code;
    const id = getNextNodeId(code);
    const updated = `${code.trimEnd()}\n    ${template(id)}`;
    updateCode(updated, { updateDiagram: true });
  };

  const shapes = [
    { label: 'Rect', fn: (id: string) => `${id}[Text]` },
    { label: 'Round', fn: (id: string) => `${id}(Text)` },
    { label: 'Stadium', fn: (id: string) => `${id}([Text])` },
    { label: 'Diamond', fn: (id: string) => `${id}{Decision}` },
    { label: 'Hexagon', fn: (id: string) => `${id}{{Hexagon}}` },
    { label: 'Circle', fn: (id: string) => `${id}((Text))` },
    { label: 'Cylinder', fn: (id: string) => `${id}[(DB)]` },
    { label: 'Para', fn: (id: string) => `${id}[/Text/]` },
    { label: 'Sub', fn: (id: string) => `${id}[[Sub]]` }
  ];

  const setDirection = (dir: string) => {
    directionOpen = false;
    const code = $stateStore.code;
    const updated = code.replace(/^(flowchart|graph)\s+\w+/m, `$1 ${dir}`);
    updateCode(updated, { updateDiagram: true });
  };

  const isElkLayout = $derived(() => {
    const code = $stateStore.code;
    return code.includes('"layout"') && code.includes('"elk"');
  });

  const toggleAutoLayout = () => {
    const code = $stateStore.code;
    if (isElkLayout()) {
      const updated = code.replace(/%%\{init:.*?}\s*%%\n?/s, '');
      updateCode(updated.trimStart(), { updateDiagram: true });
    } else {
      updateCode(`%%{init: {"layout": "elk"}}%%\n${code}`, { updateDiagram: true });
    }
  };

  const insertImage = () => {
    const code = $stateStore.code;
    const id = getNextNodeId(code);
    const updated = `${code.trimEnd()}\n    ${id}["🖼️ Image"]`;
    updateCode(updated, { updateDiagram: true });
  };

  const insertTextBlock = () => {
    const code = $stateStore.code;
    const id = getNextNodeId(code);
    const updated = `${code.trimEnd()}\n    ${id}["Text Block"]`;
    updateCode(updated, { updateDiagram: true });
  };

  const directions = [
    { label: 'Top to bottom', dir: 'TD', Icon: ArrowDownIcon },
    { label: 'Bottom to top', dir: 'BT', Icon: ArrowUpIcon },
    { label: 'Left to right', dir: 'LR', Icon: ArrowRightIcon },
    { label: 'Right to left', dir: 'RL', Icon: ArrowLeftIcon }
  ];

  let shapesOpen = $state(false);
  let directionOpen = $state(false);
</script>

<FloatingToolbar>
  <!-- Shapes -->
  <Popover.Root bind:open={shapesOpen}>
    <Popover.Trigger>
      <Button variant="ghost" size="icon" title="Shapes">
        <ShapesIcon />
      </Button>
    </Popover.Trigger>
    <Popover.Content class="w-56 p-2" align="start" sideOffset={8}>
      <p class="mb-2 px-1 text-xs font-semibold text-muted-foreground">Shapes</p>
      <div class="grid grid-cols-3 gap-1">
        {#each shapes as shape (shape.label)}
          <Button
            variant="outline"
            size="sm"
            class="h-8 text-xs"
            onclick={() => insertNode(shape.fn)}>
            {shape.label}
          </Button>
        {/each}
      </div>
    </Popover.Content>
  </Popover.Root>

  <!-- Add Image -->
  <Button variant="ghost" size="icon" title="Add Image" onclick={insertImage}>
    <ImageIcon />
  </Button>

  <!-- Text Block -->
  <Button variant="ghost" size="icon" title="Text Block" onclick={insertTextBlock}>
    <TextIcon />
  </Button>

  <Separator orientation="vertical" />

  <!-- Auto-Layout -->
  <div class="flex items-center gap-1.5 px-1">
    <span class="text-xs font-medium">Auto-Layout</span>
    <Switch
      id="autoLayout"
      class="data-[state=checked]:bg-accent"
      checked={isElkLayout()}
      onCheckedChange={toggleAutoLayout} />
  </div>

  <Separator orientation="vertical" />

  <!-- Direction -->
  <Popover.Root bind:open={directionOpen}>
    <Popover.Trigger>
      <Button variant="ghost" size="icon" title="Direction">
        <ChevronDownIcon />
      </Button>
    </Popover.Trigger>
    <Popover.Content class="w-44 p-1" align="center" sideOffset={8}>
      {#each directions as { label, dir, Icon } (dir)}
        <Button
          variant="ghost"
          class="w-full justify-start gap-2 text-sm"
          onclick={() => setDirection(dir)}>
          <Icon class="size-4" />
          {label}
        </Button>
      {/each}
    </Popover.Content>
  </Popover.Root>

  <!-- Org Chart / Layout indicator -->
  <Button variant="ghost" size="icon" title="Diagram Layout">
    <OrgChartIcon />
  </Button>
</FloatingToolbar>
