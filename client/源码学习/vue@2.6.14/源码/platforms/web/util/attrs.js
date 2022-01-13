/* @flow */

import { makeMap } from 'shared/util';

// these are reserved for web because they are directly compiled away 这些是为web保留的，因为它们是直接编译的
// during template compilation 在模板编译期间
export const isReservedAttr = makeMap('style,class');

// attributes that should be using props for binding
const acceptValue = makeMap('input,textarea,option,select,progress');
export const mustUseProp = (
  tag: string,
  type: ?string,
  attr: string
): boolean => {
  return (
    (attr === 'value' && acceptValue(tag) && type !== 'button') ||
    (attr === 'selected' && tag === 'option') ||
    (attr === 'checked' && tag === 'input') ||
    (attr === 'muted' && tag === 'video')
  );
};

// 判断属性是否 'contenteditable,draggable,spellcheck'
export const isEnumeratedAttr = makeMap('contenteditable,draggable,spellcheck');

const isValidContentEditableValue = makeMap(
  'events,caret,typing,plaintext-only'
);

// 在设置 'contenteditable,draggable,spellcheck' 属性时，对 value 值进行规范化
export const convertEnumeratedValue = (
  key: string, // 属性名
  value: any // 属性值
) => {
  return isFalsyAttrValue(value) || value === 'false'
    ? 'false' // 如果属性值是 false, null, 'false'
    : // allow arbitrary string value for contenteditable 允许contenteditable的任意字符串值
    key === 'contenteditable' && isValidContentEditableValue(value)
    ? value // contenteditable 值允许值为 'events,caret,typing,plaintext-only' 这些，否则的话直接取 'true'
    : 'true';
};

// 检测属性是否为布尔类型属性
export const isBooleanAttr = makeMap(
  'allowfullscreen,async,autofocus,autoplay,checked,compact,controls,declare,' +
    'default,defaultchecked,defaultmuted,defaultselected,defer,disabled,' +
    'enabled,formnovalidate,hidden,indeterminate,inert,ismap,itemscope,loop,multiple,' +
    'muted,nohref,noresize,noshade,novalidate,nowrap,open,pauseonexit,readonly,' +
    'required,reversed,scoped,seamless,selected,sortable,' +
    'truespeed,typemustmatch,visible'
);

export const xlinkNS = 'http://www.w3.org/1999/xlink';

// 判断指定 name 是否为 xlink: 开头
export const isXlink = (name: string): boolean => {
  return name.charAt(5) === ':' && name.slice(0, 5) === 'xlink';
};

export const getXlinkProp = (name: string): string => {
  return isXlink(name) ? name.slice(6, name.length) : '';
};

// 检测属性值是否为 null 或 false -- 此时这个属性应该进行删除
export const isFalsyAttrValue = (val: any): boolean => {
  return val == null || val === false;
};
