---
title: React とその他のフレームワーク
section: how-to
order: 8
description: React ではラッパーで、Vue・Svelte・Angular・素の HTML ではカスタム要素として、ロケットを使います。
---

`<uchusen-rocket>` は標準のカスタム要素なので、どのフレームワークでも使えます。React ではカスタム要素にオブジェクトを渡しにくいため、薄いラッパーを用意しています。

## React

```tsx no-run
import { UchusenRocket } from "@johnmorrisdotca/uchusen-rockets/react";

export function Hero() {
  return <UchusenRocket rocket="starship" variant="v3" show="apart" look="thick" label="Starship Block 3, taken apart" />;
}
```

props は要素の属性と同じです。`rocket`、`variant`、`show`、`look`、`view`、`mode`、`assets`、`spin`、`way`、`label`、`engines`、`phase` です。`build` にはオブジェクトを渡すと、ラッパーが要素の JSON 属性に変えます。ラッパーは最初に使われたときに、エフェクトの中で要素を読み込むので、サーバーレンダリングではタグだけが描かれ、ブラウザーが中身を埋めます。`react` はオプションのピア依存関係です。

```tsx no-run
import { UchusenRocket } from "@johnmorrisdotca/uchusen-rockets/react";

export const Custom = () => <UchusenRocket build={{ rocket: "starship", variant: "v3", parts: { ship: "starship-v2-ship" } }} look="painted" />;
```

## Vue

Vue に `uchusen-` で始まるタグはカスタム要素だと伝え、要素を一度インポートします。

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

Svelte は属性をそのまま渡します。

```html
<script>
  import "@johnmorrisdotca/uchusen-rockets/element";
  let look = "line";
</script>

<uchusen-rocket rocket="falcon-heavy" {look}></uchusen-rocket>
<button onclick={() => (look = look === "line" ? "thick" : "line")}>Change look</button>
```

## Angular

タグを使うコンポーネントに `CUSTOM_ELEMENTS_SCHEMA` を加え、`main.ts` で要素をインポートします。

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

## フレームワークなし

ページでのモジュールのインポートか、インポートマップつきの CDN スクリプトでも同じです。ページの例は[はじめに](getting-started.md)にあります。スクリプトを実行できない静的サイトは、[埋め込みページ](embed-on-your-site.md)を使います。

## 彩色モデルとバンドラー

彩色のロケットは、`.glb` ファイルのフォルダーからライセンスつきのモデルを読み込みます。既定のフォルダーは、要素のモジュールの隣の `./assets/` です。バンドラーはモジュールの場所を変えてしまうので、`node_modules/@johnmorrisdotca/uchusen-rockets/dist/assets` をサイトが配信する場所にコピーし、ページに一度だけ伝えてください。

```ts no-run
import { setAssetBase } from "@johnmorrisdotca/uchusen-rockets/element";

setAssetBase("/static/uchusen-assets/");
```

または、ひとつの要素に `assets` 属性を指定します。モデルが届くまで、そして届かなかったときは、パッケージ自身の塗りが表示されます。厳格なコンテンツセキュリティポリシーのページで必要な設定は[困ったとき](troubleshooting.md)にあります。
