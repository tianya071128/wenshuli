<template>
  <div class="http-test">
    <template v-if="type === 'cache'"
      >cacheControl
      <el-button type="primary" @click="sendGET"
        >发送 GET 请求, 会缓存</el-button
      >
      <el-button type="primary" @click="sendPOST"
        >发送 POST 请求, 不会缓存</el-button
      >
    </template>
    <el-button v-else-if="type === 'head'" type="primary" @click="sendHEAD">发送 HEAD 请求, 响应体不会接收到</el-button>
    <el-button v-else-if="type === 'status'" type="primary" @click="sendStatus">发送请求, 查看状态码</el-button>
    <el-button v-else-if="type === 'Encoding'" type="primary" @click="sendEncoding">发送请求, 返回 gzip 压缩数据</el-button>
    <el-button v-else-if="type === 'Pragma'" type="primary" @click="sendPragma">发送 GET 请求, 当同时存在 Cache-Control 和 Pragma, 不会进行强缓存</el-button>
    <el-button v-else-if="type === 'cacheControl'" type="primary" @click="sendGET">只存在 Cache-Control 时, 会进行强缓存, </el-button>
    <el-button v-else-if="type === '简单请求'" type="primary" @click="sendJiandan">发送简单请求 </el-button>
    <el-button v-else-if="type === '非简单请求'" type="primary" @click="sendFeiJiandan">发送非简单请求 </el-button>
    <el-button v-else-if="type === '简单请求cookie'" type="primary" @click="sendFeiJiandanCookie">简单请求-cookie </el-button>
    <el-button v-else-if="type === '简单请求cookieOk'" type="primary" @click="sendFeiJiandanCookieOk">简单请求-cookie </el-button>
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
      this.$http.post('/http/cache', { test: '123' });
    },
    sendHEAD() {
      this.$http.head('/http/cache');
    },
    sendStatus() {
      this.$http.get('/http/status', { params: { status: this.status } });
    },
    sendEncoding() {
      this.$http.get('/http/encoding');
    },
    sendPragma() {
      this.$http.get('/http/pragma');
    },
    sendJiandan() {
      this.$http.get(`${process.env.BASE_URL}/vuepress_test/http/cors`);
    },
    sendFeiJiandan() {
      this.$http.put(`${process.env.BASE_URL}/vuepress_test/http/cors`, {}, { headers: {'X-Requested-With': 'XMLHttpRequest'} });
    },
    sendFeiJiandanCookie() {
      this.$http.get(`${process.env.BASE_URL}/vuepress_test/http/cors`,{ withCredentials: true });
    },
    sendFeiJiandanCookieOk() {
      this.$http.get(`${process.env.BASE_URL}/vuepress_test/http/corsCookie`,{ withCredentials: true });
    }
  }
}
</script>

<style scoped>
.http-test {
  margin: 15px 0;
}
</style>
