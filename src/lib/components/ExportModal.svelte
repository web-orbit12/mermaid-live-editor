<script lang="ts">
  import { buttonVariants } from '$/components/ui/button';
  import * as Dialog from '$/components/ui/dialog';
  import { inputStateStore, stateStore } from '$/util/state';
  import { waitForRender } from '$lib/util/autoSync';
  import { logEvent } from '$lib/util/stats';
  import { version as FAVersion } from '@fortawesome/fontawesome-free/package.json';
  import dayjs from 'dayjs';
  import { toBase64 } from 'js-base64';
  import CopyIcon from '~icons/material-symbols/content-copy-outline-rounded';

  const FONT_AWESOME_URL = `https://cdnjs.cloudflare.com/ajax/libs/font-awesome/${FAVersion}/css/all.min.css`;

  type Format = 'png' | 'svg' | 'mmd';

  let open = $state(false);
  let format = $state<Format>('png');
  let bgColor = $state('#ffffff');
  let customBg = $state('#ffffff');
  let previewSrc = $state('');

  const bgOptions: { label: string; value: string }[] = [
    { label: 'White', value: '#ffffff' },
    { label: 'Dark', value: '#1e1a2e' },
    { label: 'Transparent', value: 'transparent' }
  ];

  /**
   * Clone the live SVG with explicit pixel dimensions and an optional background rect.
   * Explicit dimensions are required for <img> rendering (height="100%" collapses).
   * A <rect> fill is used for background because style.backgroundColor is unreliable in <img>.
   */
  const cloneSvg = (bg: string): SVGSVGElement | null => {
    const svgDOM = document.querySelector<SVGSVGElement>('#container svg');
    if (!svgDOM) return null;

    const svg = svgDOM.cloneNode(true) as SVGSVGElement;
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');

    // Set explicit pixel dimensions so browsers render the <img> at its natural size
    const vb = svgDOM.viewBox?.baseVal;
    const box = svgDOM.getBoundingClientRect();
    const w = vb && vb.width > 0 ? vb.width : box.width;
    const h = vb && vb.height > 0 ? vb.height : box.height;
    if (w > 0) svg.setAttribute('width', `${w}`);
    if (h > 0) svg.setAttribute('height', `${h}`);

    // Insert background rect as first child (reliable in <img> and canvas contexts)
    if (bg !== 'transparent') {
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('width', '100%');
      rect.setAttribute('height', '100%');
      rect.setAttribute('fill', bg);
      svg.insertBefore(rect, svg.firstChild);
    }

    return svg;
  };

  const svgToBase64 = (svg: SVGSVGElement, includeFA = false): string => {
    const svgString = svg.outerHTML
      .replaceAll('<br>', '<br/>')
      .replaceAll(/<img([^>]*)>/g, (_m, g: string) => `<img ${g} />`);
    const pi = includeFA ? `<?xml-stylesheet href="${FONT_AWESOME_URL}" type="text/css"?>\n` : '';
    return toBase64(`<?xml version="1.0" encoding="UTF-8"?>\n${pi}${svgString}`);
  };

  const refreshPreview = async () => {
    await waitForRender();
    const svg = cloneSvg(bgColor);
    // Don't include FA stylesheet in preview — external CSS in <img> is blocked by browsers
    previewSrc = svg ? `data:image/svg+xml;base64,${svgToBase64(svg, false)}` : '';
  };

  // Single effect: re-run whenever open, bgColor, or format changes
  $effect(() => {
    void open;
    void bgColor;
    void format;
    if (open && format !== 'mmd') {
      void refreshPreview();
    } else {
      previewSrc = '';
    }
  });

  const getFileName = (ext: string) =>
    `mermaid-diagram-${dayjs().format('YYYY-MM-DD-HHmmss')}.${ext}`;

  const simulateDownload = (download: string, href: string) => {
    const a = document.createElement('a');
    a.download = download;
    a.href = href;
    a.click();
    a.remove();
  };

  const doExport = async () => {
    if (format === 'mmd') {
      const code = $stateStore.code;
      const blob = new Blob([code], { type: 'text/plain' });
      simulateDownload(getFileName('mmd'), URL.createObjectURL(blob));
      logEvent('download', { type: 'mmd' });
    } else if (format === 'svg') {
      const svg = cloneSvg(bgColor);
      if (!svg) return;
      simulateDownload(getFileName('svg'), `data:image/svg+xml;base64,${svgToBase64(svg, true)}`);
      logEvent('download', { type: 'svg' });
    } else {
      // PNG via canvas
      $inputStateStore.panZoom = false;
      await new Promise((r) => setTimeout(r, 500));
      await waitForRender();
      const svgDOM = document.querySelector<SVGSVGElement>('#container svg');
      if (!svgDOM) return;
      const vb = svgDOM.viewBox?.baseVal;
      const box = svgDOM.getBoundingClientRect();
      const w = vb && vb.width > 0 ? vb.width : box.width;
      const h = vb && vb.height > 0 ? vb.height : box.height;
      const canvas = document.createElement('canvas');
      canvas.width = w * 2;
      canvas.height = h * 2;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      if (bgColor !== 'transparent') {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      const pngSvg = cloneSvg('transparent'); // bg already drawn on canvas
      if (!pngSvg) return;
      pngSvg.setAttribute('width', `${w * 2}`);
      pngSvg.setAttribute('height', `${h * 2}`);
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        simulateDownload(
          getFileName('png'),
          canvas.toDataURL('image/png').replace('image/png', 'image/octet-stream')
        );
        $inputStateStore.panZoom = true;
      };
      img.src = `data:image/svg+xml;base64,${svgToBase64(pngSvg, false)}`;
      logEvent('download', { type: 'png' });
    }
    open = false;
  };

  const copyPreview = () => {
    if (navigator.clipboard && previewSrc) {
      void navigator.clipboard.writeText(previewSrc);
    }
  };

  const checkerStyle =
    'background-image: linear-gradient(45deg,#ccc 25%,transparent 25%),' +
    'linear-gradient(-45deg,#ccc 25%,transparent 25%),' +
    'linear-gradient(45deg,transparent 75%,#ccc 75%),' +
    'linear-gradient(-45deg,transparent 75%,#ccc 75%);' +
    'background-size:16px 16px;background-position:0 0,0 8px,8px -8px,-8px 0;';
</script>

<Dialog.Root bind:open>
  <Dialog.Trigger class={buttonVariants({ size: 'sm', variant: 'outline' })}>Export</Dialog.Trigger>
  <Dialog.Content class="flex max-w-3xl flex-col gap-0 overflow-hidden bg-white p-0">
    <!-- Header -->
    <div class="flex items-center border-b px-6 py-4">
      <Dialog.Title class="text-xl font-semibold" style="color:#2B2642"
        >Export diagram</Dialog.Title>
    </div>

    <!-- Body -->
    <div class="grid grid-cols-[280px_1fr] divide-x">
      <!-- Left: options -->
      <div class="flex flex-col gap-6 p-6">
        <!-- Format -->
        <div class="flex flex-col gap-3">
          <h3 class="text-sm font-semibold tracking-wide uppercase" style="color:#6B7280">
            Export format
          </h3>
          {#each [['png', 'PNG', 'High quality raster image'], ['svg', 'SVG', 'Scalable vector graphics'], ['mmd', 'MMD', 'Mermaid syntax code']] as const as [val, label, desc] (val)}
            <label
              style={format === val
                ? 'background-color:#DDEDF0;border-color:#7FB3BD'
                : 'background-color:#FFFFFF;border-color:#D1D5DB'}
              class="flex cursor-pointer items-start gap-3 rounded-lg border-2 p-3 transition-colors">
              <input
                type="radio"
                name="export-format"
                value={val}
                bind:group={format}
                style="accent-color:#3F6E7A"
                class="mt-0.5" />
              <div>
                <div class="font-medium" style="color:#2B2642">{label}</div>
                <div class="text-sm" style="color:#6B7280">{desc}</div>
              </div>
            </label>
          {/each}
        </div>

        <!-- Background color (PNG/SVG only) -->
        {#if format !== 'mmd'}
          <div class="flex flex-col gap-3">
            <h3 class="text-sm font-semibold tracking-wide uppercase" style="color:#6B7280">
              Background color
            </h3>
            <div class="flex items-center gap-2">
              {#each bgOptions as opt (opt.value)}
                <button
                  type="button"
                  title={opt.label}
                  aria-label={opt.label}
                  onclick={() => {
                    bgColor = opt.value;
                  }}
                  class="size-9 rounded-md border-2 transition-all"
                  style="{opt.value === 'transparent'
                    ? checkerStyle
                    : `background-color:${opt.value};`}{bgColor === opt.value
                    ? 'border-color:#3F6E7A;box-shadow:0 0 0 2px #7FB3BD55'
                    : 'border-color:#D1D5DB'}">
                </button>
              {/each}
              <!-- Custom color -->
              <label
                title="Custom color"
                class="relative flex size-9 cursor-pointer items-center justify-center overflow-hidden rounded-md border-2 transition-all"
                style="background-color:{customBg};{!bgOptions.some((o) => o.value === bgColor)
                  ? 'border-color:#3F6E7A;box-shadow:0 0 0 2px #7FB3BD55'
                  : 'border-color:#D1D5DB'}">
                <input
                  type="color"
                  bind:value={customBg}
                  oninput={() => {
                    bgColor = customBg;
                  }}
                  class="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
                <span class="text-xs" style="color:{customBg === '#ffffff' ? '#888' : '#fff'}"
                  >✎</span>
              </label>
            </div>
          </div>
        {/if}
      </div>

      <!-- Right: preview -->
      <div class="flex flex-col gap-3 p-6">
        <h3 class="text-sm font-semibold tracking-wide uppercase" style="color:#6B7280">Preview</h3>
        <div
          class="relative min-h-64 flex-1 overflow-hidden rounded-lg border"
          style="background-color:#F8FAFB;border-color:#D1D5DB">
          {#if format === 'mmd'}
            <pre
              class="h-full overflow-auto p-4 font-mono text-xs"
              style="color:#2B2642">{$stateStore.code}</pre>
          {:else}
            {#if previewSrc}
              <img
                src={previewSrc}
                alt="Diagram preview"
                class="h-full w-full object-contain p-4" />
            {/if}
            <button
              type="button"
              onclick={copyPreview}
              title="Copy SVG data URI"
              class="absolute top-2 right-2 rounded border p-1.5 transition-colors"
              style="background-color:#FFFFFF;border-color:#D1D5DB;color:#2B2642">
              <CopyIcon class="size-4" />
            </button>
          {/if}
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="flex items-center justify-end gap-3 border-t px-6 py-4">
      <Dialog.Close
        class="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors"
        style="background-color:#C8D2D7;color:#2B2642">
        Cancel
      </Dialog.Close>
      <button
        type="button"
        onclick={doExport}
        class="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors"
        style="background-color:#2B2642;color:#FFFFFF">
        Export
      </button>
    </div>
  </Dialog.Content>
</Dialog.Root>
