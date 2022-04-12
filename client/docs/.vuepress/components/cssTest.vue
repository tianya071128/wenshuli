<template>
  <div>
    <template v-if="type === '::selection'">
      <div class="test-selection">
        当你高亮显示时，这个文本有特殊的样式.
        <p>也试着在这个段落中选择文本.</p>
      </div>
    </template>
    <template v-if="type === ':active'">
      <div class="test-active">
        卡片内容：可以利用 :active 伪类在点击卡片时提示一下
      </div>
    </template>
    <template v-if="type === ':focus-within'">
      <form class="focus-within">
        <label for="given_name">Given Name:</label>
        <input id="given_name" type="text" />
        <br />
        <label for="family_name">Family Name:</label>
        <input id="family_name" type="text" />
      </form>
    </template>
    <template v-if="type === ':link'">
      <p class="link">
        这一段包含一个链接:
        <a href="#链接伪类-link-和-visited">
          当你点击这个链接时，它会变成红色.
        </a>
        当你点击该段或链接时，该段将得到一个灰色的背景.
      </p>
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
.test-active {
  padding: 15px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  width: 200px;
  margin-left: 20px;
  cursor: pointer;
}
.test-active:active {
  background-color: rgba(0, 0, 0, 0.1);
}

.focus-within {
  border: 1px solid;
  color: gray;
  padding: 4px;
}
.focus-within:focus-within {
  background: #ff8;
  color: black;
}
.link a:link {
  color: blue;
}
.link a:visited {
  color: purple;
} /* 已访问链接 */
.link a:hover {
  background: yellow;
} /* 用户鼠标悬停 */
.link a:active {
  color: red;
} /* 激活链接 */

.link:active {
  background: #eee;
} /* 激活段落 */
</style>
