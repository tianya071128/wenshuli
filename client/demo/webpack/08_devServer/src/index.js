document.body.innerText = '测试一下';
fetch('/vuepress_test/http/cache').then((data) => console.log(data));
