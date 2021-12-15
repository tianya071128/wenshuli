<template>
  <div class="reference-test">
    <el-collapse v-model="activeNames">
      <el-collapse-item
        v-for="(item, index) of list"
        :key="index"
        :title="item.title"
        :name="index"
      >
        <div
          class="reference-card"
          v-for="(cardItem, i) of item.children"
          :key="i"
          @click="handlerClick(cardItem)"
        >
          <div class="card-header">
            <img
              :src="cardItem.img || '/img/default.png'"
              alt="图标"
              class="no-zoom"
            />
            <el-tooltip
              class="item"
              effect="light"
              :content="cardItem.name"
              placement="top-start"
              :open-delay="500"
            >
              <span class="link-name">{{ cardItem.name }}</span>
            </el-tooltip>
          </div>
          <el-tooltip
            class="item"
            effect="light"
            :content="cardItem.describe"
            placement="bottom"
            :open-delay="500"
          >
            <div class="card-describe">
              {{ cardItem.describe }}
            </div>
          </el-tooltip>
        </div>
      </el-collapse-item>
    </el-collapse>
  </div>
</template>

<script>
export default {
  name: 'ReferenceTest',
  data() {
    return {
      activeNames: [0],
      list: [
        {
          title: 'js',
          children: [
            {
              name: 'HTML 标准',
              img: 'https://resources.whatwg.org/logo.svg',
              describe: 'HTML 标准 - 包含 DOM、HTML5 等',
              link: 'https://whatwg.org/',
            },
            {
              name: '现代 JS 教程',
              img: 'https://zh.javascript.info/img/favicon/favicon.png',
              describe: 'JS 教程 - 概念讲解的好',
              link: 'https://zh.javascript.info/',
            },
            {
              name: 'ES6',
              img: 'https://es6.ruanyifeng.com/favicon.ico',
              describe: '书籍 - ES6 入门教程',
              link: 'https://es6.ruanyifeng.com/',
            },
            {
              name: 'JS 面试题',
              describe: '面试 - 比较有质量',
              link: 'https://github.com/yygmind/blog/issues/43',
            },
          ],
        },
        {
          title: '前端工程化',
          children: [
            {
              name: 'vscode',
              img: '/img/48.png',
              describe: 'vscode 官方网站',
              link: 'https://code.visualstudio.com/',
            },
            {
              name: 'ESLint',
              img: 'https://eslint.bootcss.com/img/logo.png',
              describe: 'ESLint 中文网 - 可组装的JavaScript和JSX检查工具',
              link: 'https://eslint.bootcss.com/',
            },
            {
              name: 'Prettier',
              img: 'https://www.prettier.cn/icon.png',
              describe: 'Prettier 中文网 - 代码格式化程序',
              link: 'https://www.prettier.cn/',
            },
            {
              name: 'Vetur',
              describe: 'Vetur 官网 - 基于 vue 的编辑器扩展',
              link: 'https://vuejs.github.io/vetur/',
            },
          ],
        },
        {
          title: '工具',
          children: [
            {
              name: '扩展迷',
              img: 'https://extension.extfans.com/static/site/src/img/logo.png',
              describe: '下载 Chrome 扩展',
              link: 'https://www.extfans.com/',
            },
          ],
        },
        {
          title: '规范',
          children: [
            {
              name: 'gitignore 规范',
              describe:
                '忽略文件的规范，适用于前端工具，例如：ESLint、Prettier等',
              link: 'http://git-scm.com/docs/gitignore',
            },
          ],
        },
      ],
    };
  },
  methods: {
    handlerClick({ link }) {
      const a = document.createElement('a');
      a.target = '_blank';
      a.href = link;
      a.click();
    },
  },
};
</script>

<style scoped>
.reference-test {
  border: 1px solid #ebebeb;
  border-radius: 3px;
  padding: 24px;
}
.reference-test /deep/ .el-collapse-item__header {
  position: relative;
  padding-left: 15px;
}
.reference-test /deep/ .el-collapse-item__header::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  display: block;
  width: 2px;
  height: 30px;
  background-color: #ffb9b5;
}
.reference-card {
  display: inline-block;
  width: 30%;
  height: 80px;
  border: 1px solid #ebebeb;
  border-radius: 3px;
  padding: 10px;
  margin-bottom: 10px;
  margin-right: 5%;
  cursor: pointer;
  vertical-align: top;
}
.reference-card:nth-of-type(3n) {
  margin-right: 0;
}
.reference-card:hover {
  background-color: #d5124c2b;
}
.card-header {
  display: flex;
  align-items: center;
}
.card-header > img {
  width: 30px;
  height: 30px;
}
.card-header .link-name {
  flex: 1;
  font-size: 16px;
  color: #4d4f91;
  margin-left: 10px;
  margin-right: 30px;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.card-describe {
  margin-top: 5px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
