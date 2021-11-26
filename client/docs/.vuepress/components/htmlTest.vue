<template>
  <div class="html-test">
    <div v-if="type === 'imgUpdate'">
      <div v-if="status !== 'cors'">
        <a href="/img/logo.png" download="logo.png">
          点击下载下面图片（同源图片，直接通过 download 属性下载）
        </a>
        <br />
        <br />
        <img src="/img/logo.png" alt="" />
      </div>
      <div v-else>
        <a class="cors_img" @click="startDownload" href="javascript: void(0)">
          点击下载下面跨域图片
        </a>
        <br />
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
      <a href="javascript: void(0)" @click="updateNode">
        点击下载下面图片（百度翻译中找的图片，通过 Node 返回二进制图片数据下载）
      </a>
      <br />
      <br />
      <img
        src="https://fanyi-cdn.cdn.bcebos.com/static/translation/widget/footer/Products/img/product-desktop@2x_c85778a.png"
        alt=""
      />
    </div>
    <div v-if="type === 'a_Target'">
      <a href="https://www.runoob.com/">target 默认为 _self</a>
      <br />
      <a href="https://www.runoob.com/" target="_blank">
        target: _blank - 新窗口(新标签页)打开
      </a>
      <br />
      <div>下面两个链接是在 iframe 中的</div>
      <iframe src="/html/04.html" frameborder="0"></iframe>
    </div>
    <div v-if="type === 'sendForm'">
      <form
        action="/vuepress_test/html/formElement"
        target="_blank"
        @submit="onSubmit"
      >
        <div class="pb10">
          <label>
            姓名：
            <input type="text" name="name" placeholder="name" />
          </label>
        </div>
        <div class="pb10">
          爱好：
          <label>
            测试1
            <input type="checkbox" name="hobby" value="1" />
          </label>
          <label>
            测试2
            <input type="checkbox" name="hobby" value="2" />
          </label>
          <label>
            测试3
            <input type="checkbox" name="hobby" value="3" />
          </label>
          <label>
            测试4
            <input type="checkbox" name="hobby" value="4" />
          </label>
        </div>
        <div class="pb10">
          性别：
          <label>
            男
            <input type="radio" name="sex" value="1" />
          </label>
          <label>
            女
            <input type="radio" name="sex" value="2" />
          </label>
        </div>
        <div class="pb10">
          选择框（单选）：
          <select name="select">
            <option value="1">选择框1</option>
            <option value="2">选择框2</option>
            <option value="3">选择框3</option>
          </select>
        </div>
        <div class="pb10">
          选择框（多选）：
          <select name="selectMultiple" multiple>
            <option value="1">选择框1</option>
            <option value="2">选择框2</option>
            <option value="3">选择框3</option>
          </select>
        </div>

        <button type="submit">提交</button>
      </form>
    </div>
    <div v-if="type === 'getCursor'">
      <input type="text" @focus="onFocus" value="点击输入框获取光标位置" />
    </div>
    <div v-if="type === 'setCursor'">
      <input type="text" ref="setCursor" value="点击按钮设置光标位置" />
      <br />
      <br />
      <el-button @click="setCursor">设置光标位置</el-button>
    </div>
    <div v-if="type === 'selectAllText'">
      <input type="text" @focus="onFocus2" value="获取焦点选择全部文本" />
    </div>
    <div v-if="type === 'selectPartText'">
      <input
        type="text"
        @select="onSelect"
        value="尝试选择文本，查看选择文本的内容"
      />
    </div>
    <div v-if="type === 'setPartText'">
      <input type="text" ref="setPartText" value="点击按钮，设置选择文本" />
      <br />
      <br />
      <el-button @click="setSelectText">设置选择文本</el-button>
    </div>
    <div v-if="type === 'switchFocus'">
      <form name="myForm2" id="myForm2">
        <input
          type="text"
          id="tex1"
          name="tex1"
          placeholder="手机号"
          maxlength="11"
          v-model="test"
        />
        <br />
        <input
          type="text"
          id="tex2"
          name="tex2"
          placeholder="手机号22"
          maxlength="11"
          v-model="test2"
        />
        <br />
        <input
          type="text"
          id="tex3"
          name="tex3"
          placeholder="手机号33"
          maxlength="11"
          v-model="test3"
        />
        <br />
      </form>
    </div>
    <div v-if="type === 'scriptCors'">
      <el-button @click="sendScript">
        点击按钮请求脚本(没有设置 crossorigin 属性)
      </el-button>
      <br />
      <br />
      <el-button @click="sendScript2">
        点击按钮请求脚本(设置 crossorigin(anonymous) 属性)
      </el-button>
      <br />
      <br />
      <el-button @click="sendScript3">
        点击按钮请求脚本(设置 crossorigin(use-credentials) 属性)
      </el-button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'HtmlTest',
  data() {
    return {
      test: '',
      test2: '',
      test3: '',
    };
  },
  props: {
    type: String,
    status: String,
  },
  mounted() {
    setTimeout(() => {
      this.switchFocus();
    }, 0);
  },
  methods: {
    startDownload() {
      function imageReceived() {
        let canvas = document.createElement('canvas');
        let context = canvas.getContext('2d');

        canvas.width = downloadedImg.width;
        canvas.height = downloadedImg.height;

        context.drawImage(downloadedImg, 0, 0);

        try {
          // 下载图片
          const aTag = document.createElement('a');
          aTag.href = canvas.toDataURL('image/png');
          aTag.download = '下载图片.png';
          aTag.click();
        } catch (err) {
          console.log('Error: ' + err);
        }
      }
      let imageURL = `${this.BASE_URL}/public/01.jpg`;

      let downloadedImg = new Image();
      ``;
      downloadedImg.crossOrigin = 'Anonymous';
      // 在图片加载完成后, 通过 canvas 下载图片
      downloadedImg.addEventListener('load', imageReceived, false);
      downloadedImg.src = imageURL;
    },
    async updateNode() {
      const data = await this.$http.get('/html/getImg', {
        responseType: 'arraybuffer',
      });
      console.log(Object.prototype.toString.call(data.data));
      const myBolb = new Blob([data.data], {
        type: data.headers['content-type'],
      });
      const imageUrl = (window.URL || window.webkitURL).createObjectURL(myBolb);
      const aTag = document.createElement('a');
      aTag.href = imageUrl;
      aTag.download = '下载图片.png';
      aTag.click();
    },
    onSubmit(e) {
      const formDOM = e.target;

      // 1. 借助 formData - 参考 stackoverflow：https://stackoverflow.com/questions/11661187/form-serialize-javascript-no-framework
      const formData = new FormData(formDOM);
      const data = {};
      // URLSearchParams 兼容性问题
      console.log(new URLSearchParams(formData).toString()); // name=1111&hobby=1&hobby=2&sex=1&select=2&selectMultiple=1&selectMultiple=2
      // 或者循环 formData 自己组装，将多选内容组装成数组
      for (const [key, value] of formData.entries()) {
        if (data[key]) {
          data[key] = Array.isArray(data[key])
            ? data[key].concat(value)
            : [data[key], value];
        } else {
          data[key] = value;
        }
      }
      console.log(data); // {name: '1111', hobby: Array(2), sex: '1', select: '2', selectMultiple: Array(2)}

      // 2. 遍历表单的表单控件 - 具体可参考 js 高程第 14 章 14.4
      const data2 = {};
      for (const field of formDOM.elements) {
        // 根据每个表单元素的 type 来区分。
        switch (field.type) {
          case 'select-one':
          case 'select-multiple':
            // 选择框，需要遍历每个选项 => 表单元素.options 引用着所有的选项
            for (const option of field.options) {
              // 根据 option.selected 属性判断是否选中项
              if (option.selected) {
                let optValue = '';
                if (option.hasAttribute) {
                  optValue = option.hasAttribute('value')
                    ? option.value
                    : option.text;
                } else {
                  optValue = option.attributes['value'].specified
                    ? option.value
                    : option.text;
                }
                if (field.type === 'select-one') {
                  data2[field.name] = optValue;
                } else {
                  data2[field.name] = (data2[field.name] || []).concat(
                    optValue
                  );
                }
              }
            }
            break;
          case undefined: // 字段集
          case 'file': // 文件输入
          case 'submit': // 提交按钮
          case 'reset': // 重置按钮
          case 'button': //自定义按钮
            // 这些表单元素不理会
            break;
          case 'radio': // 单选框
            // 根据 checked 属性判断是否选中
            if (field.checked) {
              data2[field.name] = field.value;
            }
            break;
          case 'checkbox': // 多选按钮
            if (field.checked) {
              data2[field.name] = (data2[field.name] || []).concat(field.value);
            }
            break;
          default:
            // 其他表单元素，不包含没有 name 的表单元素
            if (field.name.length) {
              data2[field.name] = field.value;
            }
            break;
        }
      }

      console.log(data2); // {name: '1111', hobby: Array(1), sex: '1', select: '2', selectMultiple: Array(2)}

      e.preventDefault();
    },
    onFocus(e) {
      const dom = e.target;

      setTimeout(() => {
        this.$message(`光标位置${this.getCursorPos(dom)}`);
      }, 0);
    },
    setCursor() {
      this.setCursorPos(this.$refs.setCursor, 5);
    },
    /**
     * 获取光标位置
     * @params {DOM} dom 输入框控件
     */
    getCursorPos(dom) {
      if (
        (dom instanceof HTMLInputElement ||
          dom instanceof HTMLTextAreaElement) &&
        document.activeElement === dom
      ) {
        let pos = 0;
        if ('selectionStart' in dom) {
          // IE8- 不支持
          pos = dom.selectionStart; // 获取光标开始的位置
        } else if ('selection' in document) {
          // 兼容 IE
          dom.focus();
          const selectRange = document.selection.createRange();
          selectRange.moveStart('character', -dom.value.length);
          pos = selectRange.text.length;
        }
        return pos;
      } else {
        throw new Error('参数错误或输入框没有获取焦点');
      }
    },
    /**
     * 设置光标位置
     * @params {DOM} dom 输入框控件
     * @params {Number} pos 需要设置光标位置
     */
    setCursorPos(dom, pos) {
      if (
        dom instanceof HTMLInputElement ||
        dom instanceof HTMLTextAreaElement
      ) {
        if (dom.setSelectionRange) {
          dom.focus();
          dom.setSelectionRange(pos, pos);
        } else if (dom.createTextRange) {
          const range = dom.createTextRange; // 创建文本范围
          range.collapse(true);
          range.moveEnd('character', pos);
          range.moveStart('character', pos);
          range.select();
        }
      } else {
        throw new TypeError('no');
      }
    },
    onFocus2(e) {
      e.target.select();
    },
    onSelect(e) {
      const dom = e.target;

      this.$message(`选择的文本为：${this.getSelectText(dom)}`);
    },
    /**
     * 设置光标位置
     * @params {DOM} dom 输入框控件
     * @returns {String} 选择的文本
     */
    getSelectText(dom) {
      if (typeof dom.selectionStart === 'number') {
        // IE8- 不支持
        return dom.value.substring(dom.selectionStart, dom.selectionEnd);
      } else if (document.selection) {
        // 兼容 IE8-
        return document.selection.createRange().text;
      }
    },
    setSelectText() {
      this.setSelectPartText(this.$refs.setPartText, 2, 5);
    },
    setSelectPartText(dom, startIndex, endIndex) {
      dom.focus(); // 要想看到效果，需要获取焦点
      if (dom.setSelectionRange) {
        dom.setSelectionRange(startIndex, endIndex);
      } else if (dom.createTextRange) {
        const range = dom.createTextRange; // 创建文本范围
        range.collapse(true);
        range.moveEnd('character', startIndex);
        range.moveStart('character', endIndex - startIndex);
        range.select();
      }
    },
    switchFocus() {
      const formDOM = document.getElementById('myForm2');
      const input1 = document.getElementById('tex1');
      const input2 = document.getElementById('tex2');
      const input3 = document.getElementById('tex3');
      const tabForward = function (e) {
        const target = e.target;
        if (target.composing) return; // 文本复合过程中不参与
        const maxLength = target.maxLength;

        // 在这里格式化内容
        target.value = target.value.replace(/[^\d]/g, '');
        if (target.value.length == maxLength) {
          debugger;
          // 输入了最大字符，切换到下一个输入框
          const i = Array.from(formDOM.elements).indexOf(target);
          if (formDOM.elements[i + 1]) {
            formDOM.elements[i + 1].focus();
          }
        }
      };

      input1.addEventListener('input', tabForward);
      input2.addEventListener('input', tabForward);
      input3.addEventListener('input', tabForward);
    },
    // 发送脚本
    sendScript() {
      window.onerror = function (message, url, line) {
        console.log('没有设置 crossorigin 属性', message, url, line); // 对于跨域脚本，通过 onerror 捕获的错误信息只有 Script error 错误信息
      };

      const dom = document.createElement('script');
      dom.src = `${this.BASE_URL}/vuepress_test/html/scriptCors`;
      document.body.appendChild(dom);
    },
    sendScript2() {
      window.onerror = function (message, url, line) {
        console.log('设置了 crossorigin：anonymous 属性', message, url, line);
      };

      const dom = document.createElement('script');
      dom.src = `${this.BASE_URL}/vuepress_test/html/scriptCors?cors=true`;
      dom.crossOrigin = 'anonymous'; // 需要使用驼峰命名
      document.body.appendChild(dom);
    },
    sendScript3() {
      window.onerror = function (message, url, line) {
        console.log('设置了 crossorigin：anonymous 属性', message, url, line);
      };

      const dom = document.createElement('script');
      dom.src = `${this.BASE_URL}/vuepress_test/html/scriptCors?cors=true`;
      dom.crossOrigin = 'use-credentials'; // 需要使用驼峰命名
      document.body.appendChild(dom);
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
