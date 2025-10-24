<template>
  <div>
    <h1 class="text-indigo-300" >------------ React project below ------------</h1>
    <div ref="host"></div>
  </div>
</template>

<script>
import { onMounted, onBeforeUnmount, ref } from 'vue';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '../../ndf-insight-brasil-main/src/App';
import '../../ndf-insight-brasil-main/src/index.css';

export default {
  setup() {
    const host = ref(null); 


    onMounted(() => {
      _renderReact();
    });

    onBeforeUnmount(() => {
      ReactDOM.unmountComponentAtNode(host.value);
    });

    const _renderReact = () => {
      if (host.value) {
        console.log('react rendered')
        ReactDOM.createRoot(host.value).render(React.createElement(App));
      }
    };

    return { host };
  },
};
</script>
