// 此文件是关于性能追踪的问题 -- 通过 window.performance 接口
import { inBrowser } from './env';

export let mark;
export let measure;

if (process.env.NODE_ENV !== 'production') {
  const perf = inBrowser && window.performance; // 获取到当前页面中与性能相关的信息。
  /* istanbul ignore if */
  if (
    perf &&
    perf.mark &&
    perf.measure &&
    perf.clearMarks &&
    perf.clearMeasures
  ) {
    mark = (tag) => perf.mark(tag);
    measure = (name, startTag, endTag) => {
      perf.measure(name, startTag, endTag);
      perf.clearMarks(startTag);
      perf.clearMarks(endTag);
      // perf.clearMeasures(name)
    };
  }
}
