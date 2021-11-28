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
            <img :src="cardItem.img || '/img/default.png'" alt="图标" />
            <span class="link-name">{{ cardItem.name }}</span>
          </div>
          <div class="card-describe">
            {{ cardItem.describe }}
          </div>
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
          title: 'vscode',
          children: [
            {
              name: 'vscode',
              img: '/img/48.png',
              describe: 'vscode 官方网站',
              link: 'https://code.visualstudio.com/',
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

<style>
* {
  box-sizing: border-box;
}
</style>

<style scoped>
.reference-test {
  border: 1px solid #ebebeb;
  border-radius: 3px;
  padding: 24px;
}
/deep/ .el-collapse-item__header {
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
  height: 100px;
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
  font-size: 16px;
  color: #4d4f91;
  margin-left: 10px;
  margin-right: 30px;
  text-align: left;
}
.card-describe {
  margin-top: 5px;
}
</style>
