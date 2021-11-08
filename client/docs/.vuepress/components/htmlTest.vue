<template>
  <div class="html-test">
    <div v-if="type === 'imgUpdate'">
      <div v-if="status !== 'cors'">
        <a href="/img/logo.png" download="logo.png"
          >点击下载下面图片（同源图片，直接通过 download 属性下载）</a
        ><br /><br />
        <img src="/img/logo.png" alt="" />
      </div>
      <div v-else>
        <a class="cors_img" @click="startDownload" href="javascript: void(0)"
          >点击下载下面跨域图片</a
        ><br />
        <img :src="`${BASE_URL}/public/01.jpg`" alt="" width="100" />
      </div>
    </div>
    <div v-if="type === 'imgCookie'">
      <div v-if="status === 'anonymous'">
        <img
          src="https://developer.mozilla.org/static/media/twitter.cc5b37fe.svg"
          width="100"
          alt="图片显示失败"
        />
        <div>这张图片来自于 MDN， 默认不会发送 cookie</div>
      </div>
      <div v-if="status === 'use-credentials'">
        <img
          src="https://developer.mozilla.org/static/media/twitter.cc5b37fe.svg"
          width="100"
          alt="图片显示失败"
          crossorigin="use-credentials"
        />
        <div>
          这张图片来自于 MDN， crossorigin 属性设置为 use-credentials，但是 MDN
          服务器没有配置跨域，所以获取图片失败了
        </div>
        <br />
        <br />
        <img
          :src="`${BASE_URL}/public/01.jpg`"
          width="100"
          alt="图片显示失败"
          crossorigin="use-credentials"
        />
        <div>
          而这张图片来自于自己的服务器，并且设置了跨域，所以满足条件，并且发送了
          cookie。但这个 cookie 是否发送还取决于 cookie 的 SameSite 属性
        </div>
      </div>
    </div>
    <div v-if="type === 'imgUpdateNode'">
      <a href="javascript: void(0)" @click="updateNode"
        >点击下载下面图片（百度翻译中找的图片，通过 Node 返回二进制图片数据下载）</a
      ><br /><br />
      <img
        src="https://fanyi-cdn.cdn.bcebos.com/static/translation/widget/footer/Products/img/product-desktop@2x_c85778a.png"
        alt=""
      />
    </div>
  </div>
</template>

<script>
export default {
  name: "HtmlTest",
  props: {
    type: String,
    status: String,
  },
  methods: {
    startDownload() {
      function imageReceived() {
        let canvas = document.createElement("canvas");
        let context = canvas.getContext("2d");

        canvas.width = downloadedImg.width;
        canvas.height = downloadedImg.height;

        context.drawImage(downloadedImg, 0, 0);

        try {
          // 下载图片
          const aTag = document.createElement("a");
          aTag.href = canvas.toDataURL("image/png");
          aTag.download = "下载图片.png";
          aTag.click();
        } catch (err) {
          console.log("Error: " + err);
        }
      }
      let imageURL = `${this.BASE_URL}/public/01.jpg`;

      let downloadedImg = new Image();
      ``;
      downloadedImg.crossOrigin = "Anonymous";
      // 在图片加载完成后, 通过 canvas 下载图片
      downloadedImg.addEventListener("load", imageReceived, false);
      downloadedImg.src = imageURL;
    },
    async updateNode() {
      const data = await this.$http.get("/html/getImg", {
        responseType: "arraybuffer",
      });
      console.log(Object.prototype.toString.call(data.data))
      const myBolb = new Blob([data.data], { type: data.headers["content-type"] });
      const imageUrl = (window.URL || window.webkitURL).createObjectURL(myBolb);
      const aTag = document.createElement("a");
      aTag.href = imageUrl;
      aTag.download = "下载图片.png";
      aTag.click();
    },
  },
};
</script>

<style scoped>
.html-test {
  padding: 10px 0;
}
.pb10 {
  padding-bottom: 10px;
}
div {
  margin: 0;
  padding: 0;
}
</style>