<script lang="ts">
  import { onMount } from "svelte";

  let { rocket = "falcon-heavy", look = "thick" }: { rocket?: string; look?: "line" | "thick" | "painted" } = $props();

  // The element needs a browser: onMount never runs on the server.
  onMount(() => {
    void import("@johnmorrisdotca/uchusen-rockets/element");
  });
</script>

<uchusen-rocket {rocket} {look}></uchusen-rocket>
