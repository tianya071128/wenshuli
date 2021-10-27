<!--
 * @Descripttion: 
 * @Author: 温祖彪
 * @Date: 2021-10-26 11:03:45
 * @LastEditors: sueRimn
 * @LastEditTime: 2021-10-27 15:34:05
-->
<template>
  <div class="http-test">
    <template v-if="type === 'cache'">
      <el-button type="primary" @click="sendGET">发送 GET 请求, 会缓存</el-button>
      <el-button type="primary" @click="sendPOST">发送 POST 请求, 不会缓存</el-button>
    </template>
    <el-button v-else-if="type === 'head'" type="primary" @click="sendHEAD">发送 HEAD 请求, 响应体不会接收到</el-button>
    <el-button v-else-if="type === 'status'" type="primary" @click="sendStatus">发送请求, 查看状态码</el-button>
    <el-button v-else-if="type === 'Encoding'" type="primary" @click="sendEncoding">发送请求, 返回 gzip 压缩数据</el-button>
  </div>
</template>

<script>
export default {
  name: 'HttpTest',
  props: {
    type: String,
    status: String,
  },
  methods: {
    sendGET() {
      this.$http.get('/http/cache');
    },
    sendPOST() {
      this.$http.post('/http/cache', {test: '123'});
    },
    sendHEAD() {
      this.$http.head('/http/cache');
    },
    sendStatus() {
      this.$http.get('/http/status', { params: { status: this.status } });
    },
    sendEncoding() {
      this.$http.get('/http/encoding');
    }
  }
}
</script>

<style  scoped>
  .http-test {
    margin: 15px 0;
  }
</style>