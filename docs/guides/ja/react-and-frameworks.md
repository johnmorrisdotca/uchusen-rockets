---
title: React とその他のフレームワーク
section: how-to
order: 8
description: React ではラッパーで、Vue・Svelte・Angular・素の HTML ではカスタム要素として、ロケットを使います。どの例もビルドして、ブラウザーで開いて確かめています。
---

`<uchusen-rocket>` は標準のカスタム要素なので、どのフレームワークでも使えます。React ではカスタム要素にオブジェクトを渡しにくいため、薄いラッパーを用意しています。このページの例は、すべて [`examples/`](https://github.com/johnmorrisdotca/uchusen-rockets/tree/main/examples) のファイルです。`pnpm test:usage` が、npm が作るとおりのパッケージを使って、ひとつずつビルドし、ブラウザーで開いてロケットが描かれるのを待ち、このページに同じファイルがそのまま載っているかも確かめます。

## React

```tsx no-run
import { UchusenRocket } from "@johnmorrisdotca/uchusen-rockets/react";

export function RocketView({ look = "thick" }: { look?: "line" | "thick" | "painted" }) {
  return <UchusenRocket rocket="starship" variant="v3" show="apart" look={look} label="Starship Block 3, taken apart" />;
}
```

props は要素の属性と同じです。`rocket`、`variant`、`show`、`look`、`view`、`mode`、`assets`、`spin`、`way`、`label`、`engines`、`phase` です。`build` にはオブジェクトを渡すと、ラッパーが要素の JSON 属性に変えます。ラッパーは最初に使われたときに、エフェクトの中で要素を読み込むので、サーバーレンダリング（`renderToString`）ではタグ（`<uchusen-rocket rocket="starship" ...>`）だけが描かれ、ブラウザーが中身を埋めます。`react` はオプションのピア依存関係です。

```tsx no-run
import { UchusenRocket } from "@johnmorrisdotca/uchusen-rockets/react";

export const Custom = () => <UchusenRocket build={{ rocket: "starship", variant: "v3", parts: { ship: "starship-v2-ship" } }} look="painted" />;
```

## Vue

Vite の設定で、`uchusen-` で始まるタグはカスタム要素だと Vue に伝えます。

```ts no-check
import vue from "@vitejs/plugin-vue";

export default { plugins: [vue({ template: { compilerOptions: { isCustomElement: (tag: string) => tag.startsWith("uchusen-") } } })] };
```

そのうえで、コンポーネントがページに載ってから要素をインポートします。サーバーが描いているあいだは読み込みません。

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

Svelte は属性をそのまま渡します。`onMount` はサーバーでは動かないので、インポートはブラウザーを待ちます。

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

タグを使うコンポーネントに `CUSTOM_ELEMENTS_SCHEMA` を加えます。`ngOnInit` はサーバーが描くときにも動くので、インポートはブラウザーを待ちます。

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

## フレームワークなし

ページでのモジュールのインポートか、インポートマップつきの CDN スクリプトでも同じです。ページの例は[はじめに](getting-started.md)に、unpkg・Vite・webpack は[バンドラーと CDN](bundlers-and-cdn.md)にあります。スクリプトを実行できない静的サイトは、[埋め込みページ](embed-on-your-site.md)を使います。

## 彩色モデルとバンドラー

彩色のロケットは、`.glb` ファイルのフォルダーからライセンスつきのモデルを読み込みます。既定のフォルダーは、要素のモジュールの隣の `./assets/` です。バンドラーはモジュールの場所を変えてしまうので、`node_modules/@johnmorrisdotca/uchusen-rockets/dist/assets` をサイトが配信する場所にコピーし、ページに一度だけ伝えてください。

```ts no-run
import { setAssetBase } from "@johnmorrisdotca/uchusen-rockets/element";

setAssetBase("/static/uchusen-assets/");
```

または、ひとつの要素に `assets` 属性を指定します。モデルが届くまで、そして届かなかったときは、パッケージ自身の塗りが表示されます。厳格なコンテンツセキュリティポリシーのページで必要な設定は[困ったとき](troubleshooting.md)にあります。
