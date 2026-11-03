---
title: React and other frameworks
section: how-to
order: 8
description: Use the rocket in React with the wrapper, and in Vue, Svelte, Angular or plain HTML as a custom element, each as an example that is built and opened in a browser.
---

`<uchusen-rocket>` is a standard custom element, so every framework can use it. React gets a thin wrapper because it has trouble passing objects to custom elements. Every example on this page is a file in [`examples/`](https://github.com/johnmorrisdotca/uchusen-rockets/tree/main/examples). `pnpm test:usage` builds each one against the package as npm packs it, opens it in a browser and waits for the rocket to be drawn, and checks that this page holds the file word for word.

## React

```tsx no-run
import { UchusenRocket } from "@johnmorrisdotca/uchusen-rockets/react";

export function RocketView({ look = "thick" }: { look?: "line" | "thick" | "painted" }) {
  return <UchusenRocket rocket="starship" variant="v3" show="apart" look={look} label="Starship Block 3, taken apart" />;
}
```

The props are the element's attributes: `rocket`, `variant`, `show`, `look`, `view`, `mode`, `assets`, `spin`, `way`, `label`, `engines` and `phase`. `build` takes an object, which the wrapper turns into the element's JSON attribute. The wrapper loads the element on first use inside an effect, so server rendering (`renderToString`) draws only the tag, `<uchusen-rocket rocket="starship" ...>`, and the browser fills it in. `react` is an optional peer dependency.

```tsx no-run
import { UchusenRocket } from "@johnmorrisdotca/uchusen-rockets/react";

export const Custom = () => <UchusenRocket build={{ rocket: "starship", variant: "v3", parts: { ship: "starship-v2-ship" } }} look="painted" />;
```

## Vue

Tell Vue that `uchusen-` tags are custom elements, in the Vite configuration:

```ts no-check
import vue from "@vitejs/plugin-vue";

export default { plugins: [vue({ template: { compilerOptions: { isCustomElement: (tag: string) => tag.startsWith("uchusen-") } } })] };
```

Then import the element once the component is on the page, never while a server renders it:

```html
<script setup lang="ts">
import { onMounted } from "vue";

withDefaults(defineProps<{ rocket?: string; variant?: string; look?: "line" | "thick" | "painted" }>(), { rocket: "falcon-9", variant: "block-5", look: "thick" });

// The element needs a browser: import it once the component is on the page, never while a server renders it.
onMounted(() => {
  void import("@johnmorrisdotca/uchusen-rockets/element");
});
</script>

<template>
  <uchusen-rocket :rocket="rocket" :variant="variant" :look="look"></uchusen-rocket>
</template>
```

## Svelte

Svelte passes attributes straight through. `onMount` never runs on the server, so the import waits for a browser.

```html
<script lang="ts">
  import { onMount } from "svelte";

  let { rocket = "falcon-heavy", look = "thick" }: { rocket?: string; look?: "line" | "thick" | "painted" } = $props();

  // The element needs a browser: onMount never runs on the server.
  onMount(() => {
    void import("@johnmorrisdotca/uchusen-rockets/element");
  });
</script>

<uchusen-rocket {rocket} {look}></uchusen-rocket>
```

## Angular

Add `CUSTOM_ELEMENTS_SCHEMA` to the component that uses the tag. `ngOnInit` also runs when a server renders, so the import waits for a browser.

```ts no-check
import { Component, CUSTOM_ELEMENTS_SCHEMA, Input, OnInit } from "@angular/core";

@Component({
  selector: "app-rocket-view",
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `<uchusen-rocket [attr.rocket]="rocket" [attr.look]="look"></uchusen-rocket>`,
})
export class RocketViewComponent implements OnInit {
  @Input() rocket = "dragon";
  @Input() look: "line" | "thick" | "painted" = "thick";

  ngOnInit(): void {
    // The element needs a browser: ngOnInit also runs when a server renders, so the import waits for one.
    if (typeof window !== "undefined") void import("@johnmorrisdotca/uchusen-rockets/element");
  }
}
```

## No framework

A module import in a page, or a CDN script with an import map, is the same thing. [Getting started](getting-started.md) has the page, and [Bundlers and CDNs](bundlers-and-cdn.md) has unpkg, Vite and webpack. Static sites that cannot run script use the [embed page](embed-on-your-site.md).

## Painted models and bundlers

A painted rocket loads its licensed model from a folder of `.glb` files. By default that folder is `./assets/` beside the element's module. A bundler moves the module, so copy `node_modules/@johnmorrisdotca/uchusen-rockets/dist/assets` somewhere your site serves, and tell the page once:

```ts no-run
import { setAssetBase } from "@johnmorrisdotca/uchusen-rockets/element";

setAssetBase("/static/uchusen-assets/");
```

or set the `assets` attribute on one element. Until the model is in, and if it never arrives, the package's own paint shows. [Troubleshooting](troubleshooting.md) covers the content security policy a strict page needs.
