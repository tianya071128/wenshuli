import { Cloner } from './接口合并';
import axios, { AxiosRequestTransformer } from 'axios';

// 增强本地模块声明 OK
const c: Cloner = {
  A: 1,
  B: 2,
  C: '',
};

axios.Test; // 增强 npm 库模块声明 OK
