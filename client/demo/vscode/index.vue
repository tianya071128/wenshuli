<template>
  <div>
    <span @click="test"></span>
  </div>
</template>

<script>
import { test } from './index';
import axios from 'axios';

axios.post();

export default {
  methods: {
    test,
    test2() {
      this.test(1, 2);
      const aa = 123;
      console.log(aa);
    },
  },
};
</script>

<style></style>
