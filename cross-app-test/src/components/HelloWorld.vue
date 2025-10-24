<template>
    <div class="m-9">
      <react-project />
    </div>
</template>
<script setup>
import { computed, ref } from "vue";
import ReactProject from "./ReactProject.vue";
import { useToggleFilter } from "../store";

const toggleStore = useToggleFilter();
const menu = computed(() => toggleStore.showFilters);
function toggle() {
  toggleStore.toggleFilter();
}

defineProps({
  msg: String,
});

const count = ref(0);

</script>
<style scoped>
.read-the-docs {
  color: #888;
}
</style>
