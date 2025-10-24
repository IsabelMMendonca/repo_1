<script setup>
import { ref } from 'vue'
import ReactProject from './ReactProject.vue'
defineProps({
  msg: String,
})

const count = ref(0)
</script>

<template>
  <div>
    <h1>{{ msg }}: vue project here</h1>
  <div class="card">
    <button  type="button" @click="count++">  count is <span class=" text-red-400 font-bold">{{ count }}</span></button>
  </div>
<div>
  <react-project/>
</div>
  </div>
  
</template>

<style scoped>
.read-the-docs {
  color: #888;
}
</style>
