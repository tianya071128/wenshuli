/* @flow */

import { inBrowser } from 'core/util/env';
import { makeMap } from 'shared/util';

export const namespaceMap = {
  svg: 'http://www.w3.org/2000/svg',
  math: 'http://www.w3.org/1998/Math/MathML',
};

export const isHTMLTag = makeMap(
  'html,body,base,head,link,meta,style,title,' +
    'address,article,aside,footer,header,h1,h2,h3,h4,h5,h6,hgroup,nav,section,' +
    'div,dd,dl,dt,figcaption,figure,picture,hr,img,li,main,ol,p,pre,ul,' +
    'a,b,abbr,bdi,bdo,br,cite,code,data,dfn,em,i,kbd,mark,q,rp,rt,rtc,ruby,' +
    's,samp,small,span,strong,sub,sup,time,u,var,wbr,area,audio,map,track,video,' +
    'embed,object,param,source,canvas,script,noscript,del,ins,' +
    'caption,col,colgroup,table,thead,tbody,td,th,tr,' +
    'button,datalist,fieldset,form,input,label,legend,meter,optgroup,option,' +
    'output,progress,select,textarea,' +
    'details,dialog,menu,menuitem,summary,' +
    'content,element,shadow,template,blockquote,iframe,tfoot'
);

// this map is intentionally selective, only covering SVG elements that may
// contain child elements.
export const isSVG = makeMap(
  'svg,animate,circle,clippath,cursor,defs,desc,ellipse,filter,font-face,' +
    'foreignobject,g,glyph,image,line,marker,mask,missing-glyph,path,pattern,' +
    'polygon,polyline,rect,switch,symbol,text,textpath,tspan,use,view',
  true
);

export const isPreTag = (tag: ?string): boolean => tag === 'pre';

// 检测指定 tag 是否为 html 或 svg 标签
export const isReservedTag = (tag: string): ?boolean => {
  return isHTMLTag(tag) || isSVG(tag);
};

export function getTagNamespace(tag: string): ?string {
  if (isSVG(tag)) {
    return 'svg';
  }
  // basic support for MathML
  // note it doesn't support other MathML elements being component roots
  if (tag === 'math') {
    return 'math';
  }
}

const unknownElementCache = Object.create(null);
// 检测 tag 是否为未知元素，如果是返回 true。不是将所有的合法标签列举出来，而是创建 tag 类型元素，在进行判断
export function isUnknownElement(tag: string): boolean {
  /* istanbul ignore if */
  // 不是浏览器环境，则直接返回 true
  if (!inBrowser) {
    return true;
  }
  // 检测指定 tag 是否为 html 或 svg 标签，如果是直接返回 false
  if (isReservedTag(tag)) {
    return false;
  }
  tag = tag.toLowerCase();
  /* istanbul ignore if */
  // 如果存在缓存，则取缓存值
  if (unknownElementCache[tag] != null) {
    return unknownElementCache[tag];
  }
  const el = document.createElement(tag); // 通过创建 tag 元素测试
  if (tag.indexOf('-') > -1) {
    // http://stackoverflow.com/a/28210364/1070244
    return (unknownElementCache[tag] =
      el.constructor === window.HTMLUnknownElement ||
      el.constructor === window.HTMLElement);
  } else {
    return (unknownElementCache[tag] = /HTMLUnknownElement/.test(
      el.toString()
    ));
  }
}

export const isTextInputType = makeMap(
  'text,number,password,search,email,tel,url'
);
