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
