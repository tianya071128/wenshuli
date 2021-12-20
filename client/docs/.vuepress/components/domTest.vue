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
    <p v-if="type === 'updateResources'">
      <!-- <a href="http://localhost:8080/js/operation/"> -->
      <a href="http://localhost:5000/public/loading.zip" target="_blank">
        <el-button type="primary">
          下载自定义文件
        </el-button>
      </a>
    </p>
  </div>
</template>

<script>
export default {
  name: 'DomTest',
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
  },
};
</script>

<style scoped>
.http-test {
  margin: 15px 0;
}
</style>
