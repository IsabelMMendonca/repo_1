<template>
  <div>
    <h3 
    :style="{transform : menu ? 'translateX(15%)' : 'translateX(0%)'}"
    style="transition: all .3s ease;"
    class="text-indigo-100 bg-indigo-700 p-3 rounded-lg">
      ------------ React project rendered on vue ------------
    </h3>
    <div ref="host"></div>
  </div>
</template>

<script>
import { useToggleFilter } from "../store/index";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "../../ndf-insight-brasil-main/src/App";
import "../../ndf-insight-brasil-main/src/index.css";
import { mapStores } from "pinia";

export default {
  data() {
    return {
      host: null,
    };
  },
  mounted() {
    this.host = this.$refs.host
    this._renderReact();
    window.toggleStore = this.toggleFilterStore
  },

  beforeUnmount() {
    if (this.host) {
      ReactDOM.unmountComponentAtNode(this.host);
    }
  },
  methods: {
    _renderReact() {
      if (this.host) {
        ReactDOM.createRoot(this.host).render(React.createElement(App));
      }
    },
  },
  computed:{
    ...mapStores(useToggleFilter),
    menu(){
      return this.toggleFilterStore.showFilters
    }
  }
};
</script>
