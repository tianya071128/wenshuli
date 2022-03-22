<template>
  <div>
    <span @click="test"></span>
  </div>
</template>

<script>
import { test } from './index';

export default {
  methods: {
    test,
    test2() {
      this.test(1, 2);
    },
  },
};
</script>

<style></style>
