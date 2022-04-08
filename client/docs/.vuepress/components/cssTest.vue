<template>
  <div>
    <template v-if="type === '::selection'">
      <div class="test-selection">
        当你高亮显示时，这个文本有特殊的样式.
        <p>也试着在这个段落中选择文本.</p>
      </div>
    </template>
  </div>
</template>

<script>
export default {
  name: 'CssTest',
  props: {
    type: String,
  },
};
</script>

<style scoped>
/* 选中的文本是红色背景，金黄色的字体 */
.test-selection::selection {
  color: gold;
  background-color: red;
}

/*选中的是蓝色背景，白色的字体的段落*/
.test-selection p::selection {
  color: white;
  background-color: blue;
}
</style>
