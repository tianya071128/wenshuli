/*
 * @Descripttion: axios 配置
 * @Author: 温祖彪
 * @Date: 2021-09-17 10:28:35
 * @LastEditors: sueRimn
 * @LastEditTime: 2021-10-27 15:51:36
 */
import axios from 'axios';
import { Loading } from 'element-ui';

const request = axios.create({
  baseURL: '/vuepress_test',
  timeout: 60000, // 超时时间 60s
});
let loadingInstance = null;

// 请求拦截器
request.interceptors.request.use(
  config => {
    loadingInstance = Loading.service({
      fullscreen: true,
      lock: true
    })
    return config;
  },
  error => {
    // 经过测试, 这里一般不会经过, 因为在 axios 内部是通过 promise.then(成功回调, 失败回调注册的), 所以即使在成功回调中出错了, 也不会传递到这里来, 只会传递到下一个处理失败态的回调
    return Promise.reject(error);
  }
);

// 响应拦截器
request.interceptors.response.use(
  response => {
    loadingInstance.close();
    console.log(response);
    return response;
  },
  error => {
    loadingInstance.close();

    return Promise.reject(error);
  }
);

export default request;
