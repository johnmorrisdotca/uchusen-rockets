---
title: React and other frameworks
section: how-to
order: 8
description: Use the rocket in React with the wrapper, and in Vue, Svelte, Angular or plain HTML as a custom element.
---

`<uchusen-rocket>` is a standard custom element, so every framework can use it. React gets a thin wrapper because it has trouble passing objects to custom elements.

## React

```tsx no-run
import { UchusenRocket } from "@johnmorrisdotca/uchusen-rockets/react";

export function Hero() {
  return <UchusenRocket rocket="starship" variant="v3" show="apart" look="thick" label="Starship Block 3, taken apart" />;
}
```

The props are the element's attributes: `rocket`, `variant`, `show`, `look`, `view`, `mode`, `assets`, `spin`, `way`, `label`, `engines` and `phase`. `build` takes an object, which the wrapper turns into the element's JSON attribute. The wrapper loads the element on first use inside an effect, so server rendering draws only the tag, and the browser fills it in. `react` is an optional peer dependency.

```tsx no-run
import { UchusenRocket } from "@johnmorrisdotca/uchusen-rockets/react";

export const Custom = () => <UchusenRocket build={{ rocket: "starship", variant: "v3", parts: { ship: "starship-v2-ship" } }} look="painted" />;
```

## Vue

Tell Vue that `uchusen-` tags are custom elements, then import the element once.

```ts no-check
// vite.config.ts
import vue from "@vitejs/plugin-vue";

export default { plugins: [vue({ template: { compilerOptions: { isCustomElement: (tag: string) => tag.startsWith("uchusen-") } } })] };
```

```html
<script setup>
import "@johnmorrisdotca/uchusen-rockets/element";
</script>

<template>
  <uchusen-rocket rocket="falcon-9" variant="block-5" look="painted" />
</template>
```

## Svelte

Svelte passes attributes straight through.

```html
<script>
  import "@johnmorrisdotca/uchusen-rockets/element";
  let look = "line";
</script>

<uchusen-rocket rocket="falcon-heavy" {look}></uchusen-rocket>
<button onclick={() => (look = look === "line" ? "thick" : "line")}>Change look</button>
```

## Angular

Add `CUSTOM_ELEMENTS_SCHEMA` to the component that uses the tag, and import the element in `main.ts`.

```ts no-check
import { Component, CUSTOM_ELEMENTS_SCHEMA } from "@angular/core";
import "@johnmorrisdotca/uchusen-rockets/element";

@Component({
  selector: "app-rocket",
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `<uchusen-rocket rocket="dragon" variant="dragon-2" look="painted"></uchusen-rocket>`,
})
export class RocketComponent {}
```

## No framework

A module import in a page, or a CDN script with an import map, is the same thing. [Getting started](getting-started.md) has the page. Static sites that cannot run script use the [embed page](embed-on-your-site.md).

## Painted models and bundlers

A painted rocket loads its licensed model from a folder of `.glb` files. By default that folder is `./assets/` beside the element's module. A bundler moves the module, so copy `node_modules/@johnmorrisdotca/uchusen-rockets/dist/assets` somewhere your site serves, and tell the page once:

```ts no-run
import { setAssetBase } from "@johnmorrisdotca/uchusen-rockets/element";

setAssetBase("/static/uchusen-assets/");
```

or set the `assets` attribute on one element. Until the model is in, and if it never arrives, the package's own paint shows. [Troubleshooting](troubleshooting.md) covers the content security policy a strict page needs.
