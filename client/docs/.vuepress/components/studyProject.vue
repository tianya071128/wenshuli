<template>
  <div class="study-project">
    <iframe
      class="project-content"
      src="http://weshuli.com/study/#/home"
      frameborder="0"
    ></iframe>
  </div>
</template>

<script>
export default {
  name: 'StudyProject',
};
</script>

<style scoped>
.study-project {
  display: flex;
  justify-content: center;
}
.project-content {
  width: 375px;
  height: 667px;
  box-sizing: content-box;
  border-radius: 8px;
  padding: 16px;
  border: 1px solid rgba(44, 44, 44, 0.1);
}
.a {
  width: 100%;
  position: absolute;
  bottom: 0;
}
</style>
