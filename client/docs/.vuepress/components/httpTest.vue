<!--
 * @Descripttion: 
 * @Author: 温祖彪
 * @Date: 2021-10-26 11:03:45
 * @LastEditors: sueRimn
 * @LastEditTime: 2021-10-26 11:52:51
-->
<template>
  <div class="http-test">
    <el-button type="primary">主要按钮</el-button>
  </div>
</template>

<script>
export default {
  name: 'HttpTest',
  created() {
    this.$http.get('/test')
  }
}
</script>