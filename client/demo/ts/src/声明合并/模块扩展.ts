/**
 * 1. 增加模块声明：将模块中导出的声明进行增强，就好像它们在与原件同一文件中声明一样。
 *      -> 无法在模块中声明新的顶级声明，只是对现有声明的补丁。
 *      -> 默认导出也不能增加，仅命名出口
 *
 */
// 增加本地模块
import { Cloner } from './接口合并';
import 'axios';

declare module './接口合并' {
  interface Cloner {
    C: string;
  }
}

// 增强 npm 库
declare module 'axios' {
  interface AxiosStatic {
    Test: string;
  }
  interface AxiosRequestTransformer {
    Test: string;
  }
}
