<template>
  <div class="html-test">
    <div v-if="type === 'capture'" style="display:flex">
      <div @click.capture="onClick4" style="margin-right: 15px">
        <el-button type="primary" @click="onClick2">
          捕获
        </el-button>
      </div>
      <div @click.capture="onClick5">
        <el-button type="primary" @click="onClick2">
          取消捕获
        </el-button>
      </div>
    </div>
    <p v-if="type === 'noBubbling'">
      <input @blur="onBlur" type="text" placeholder="失焦不会冒泡" />
    </p>
    <p v-if="type === 'prevent'">
      <el-button type="primary" @click="onClick6">点击试试</el-button>
    </p>
    <p v-if="type === 'prevent2'">
      <input
        style="width: 300px"
        @mousedown="onClick7"
        @focus="onClick8"
        placeholder="阻止了鼠标按下事件，也就无法获取焦点"
      />
    </p>
    <p v-if="type === 'imgLoad'">
      <el-button type="primary" @click="onClick9">加载图片</el-button>
    </p>
    <p v-if="type === 'jsLoad'">
      <el-button type="primary" @click="onClick10">加载脚本</el-button>
    </p>
    <p v-if="type === 'updateCustom'">
      <el-button type="primary" @click="onClick11">
        下载自定义文件
      </el-button>
    </p>
    <div v-if="type === 'xhrExample'">
      <p>
        <label>
          <input
            type="file"
            style="display:none"
            ref="input"
            @change="onChangeFile"
          />
          <el-button size="mini" type="primary" @click="onClick12">
            选取文件
          </el-button>
        </label>
        <el-input-number
          size="mini"
          :step="500"
          v-model="timeout"
        ></el-input-number>
        <el-button size="mini" type="primary" @click="onClick13" v-if="!!xhr">
          取消上传
        </el-button>
      </p>
      <div>
        上传进度条：
        <el-progress
          v-if="updateStatus"
          :percentage="updateProgress"
          :status="updateStatus"
        ></el-progress>
        <el-progress v-else :percentage="updateProgress"></el-progress>
      </div>
      <div>
        响应进度条：
        <el-progress
          v-if="responseStatus"
          :percentage="responseProgress"
          :status="responseStatus"
        ></el-progress>
        <el-progress v-else :percentage="responseProgress"></el-progress>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'DomTest',
  data() {
    return {
      updateStatus: '', // 上传进度条状态
      updateProgress: 0, // 上传进度条进度
      xhr: null, //
      timeout: 0, // 超时时间
      responseStatus: '', // 上传进度条状态
      responseProgress: 0, // 响应进度
    };
  },
  props: {
    type: String,
  },
  methods: {
    onClick2(e) {
      alert('我是按钮');
    },
    onClick4(e) {
      alert('我是按钮的父元素');
    },
    onClick5(e) {
      e.stopPropagation();
      alert(
        '我是按钮的父元素-捕获阶段取消，那么后面的事件处理程序也就不会触发了'
      );
    },
    onBlur(e) {
      console.log(e.cancelable);
      alert('失焦事件，但不会冒泡到 window 上');
    },
    onClick6() {
      window.addEventListener('scroll', (e) => {
        e.preventDefault();
      });
    },
    onClick7(e) {
      e.preventDefault();
    },
    onClick8() {
      console.log('双击事件');
    },
    onClick9() {
      let image = document.createElement('img');
      image.addEventListener('load', (event) => {
        alert('图片加载完成');
      });
      document.body.appendChild(image);
      image.src = '/img/64.png';
    },
    onClick10() {
      let script = document.createElement('script');
      script.addEventListener('load', (event) => {
        alert('脚本加载并执行完成');
      });
      script.src = '/js/test.js';
      document.body.appendChild(script);
    },
    onClick11() {
      /** 变量定义 */
      let debug = { hello: 'world' };
      let blob = new Blob([JSON.stringify(debug, null, 2)], {
        type: 'application/json', // 文件 MIME
      });
      let link = document.createElement('a');

      link.download = 'hello.json';
      link.href = URL.createObjectURL(blob);
      link.click();
      URL.revokeObjectURL(link.href);
    },
    onClick12() {
      this.$refs.input.value = null;
      this.$refs.input.click();
    },
    onClick13() {
      this.xhr && this.xhr.abort();
    },
    onChangeFile() {
      const files = this.$refs.input.files;
      if (files) {
        this.updateFile(files[0]);
      }
    },
    updateFile(file) {
      this.updateStatus = '';
      this.updateProgress = 0;
      this.responseStatus = '';
      this.responseProgress = 0;

      let fromData = new FormData();
      fromData.append('file', file);

      const xhr = new XMLHttpRequest();
      let result = null;
      let handleEnd = () => {
        if (result.isSuccess) {
          if (xhr.status === 200) {
            this.responseStatus = 'success';
          } else {
            this.$message.error(xhr.response);
            this.responseStatus = 'exception';
          }
        } else {
          this.responseStatus = 'exception';
          this.$message.error(result.msg);
        }
        this.xhr = null;
      };

      xhr.open('POST', '/vuepress_test/html/xhr');
      xhr.getResponseHeader('Content-Type', 'multipart/form-data');
      xhr.timeout = this.timeout || 0;

      /** 为 xhr 监听各种事件 */
      /** xhr 事件监听 */
      xhr.onerror = () => {
        console.log('是否失败？ -- onerror');
        result = {
          isSuccess: false,
          msg: '请求出错',
        };
        handleEnd();
      };
      xhr.onabort = () => {
        console.log('是否取消 -- abort');
        result = {
          isSuccess: false,
          msg: '请求取消',
        };
        handleEnd();
      };
      xhr.ontimeout = () => {
        console.log('是否超时 -- timeout');
        result = {
          isSuccess: false,
          msg: '请求超时',
        };
        handleEnd();
      };
      xhr.onload = () => {
        result = {
          isSuccess: true,
          msg: '请求成功',
        };
        handleEnd();
      };

      /** 响应进度事件 */
      xhr.onprogress = (event) => {
        if (event.lengthComputable) {
          // 已知响应大小
          this.responseProgress = Math.ceil((event.loaded / event.total) * 100);
        }
      };

      /** 上传进度事件 */
      xhr.upload.onprogress = (event) => {
        setTimeout(() => {
          if (result && !result.isSuccess) return;
          // 奇怪的是，如果将网络调试断开，那么这个进度事件也会触发并且 event.loaded === event.total
          // 但是如果是取消了的话，就不会被触发
          // 所以我们需要判断一下是否请求出错
          // 因为这个事件优先于 xhr.onerror 事件，所以我们就需要延迟一下执行
          this.updateProgress = Math.ceil((event.loaded / event.total) * 100);
        }, 0);
      };
      xhr.upload.onloadend = () => {
        // 无论成功与否都会触发，就可以在这里检测是否上传成功
        setTimeout(() => {
          this.updateStatus =
            this.updateProgress === 100 ? 'success' : 'exception';
        }, 0);
      };

      xhr.send(fromData);

      // 赋值给 this
      this.xhr = xhr;
    },
  },
};
</script>

<style scoped>
.http-test {
  margin: 15px 0;
}
</style>
