/* @flow */

import { namespaceMap } from 'web/util/index';

// 创建一个 DOM 元素
export function createElement(tagName: string, vnode: VNode): Element {
  const elm = document.createElement(tagName); // 创建元素
  // 如果不是 select 元素，则返回
  if (tagName !== 'select') {
    return elm;
  }
  // false or null will remove the attribute but undefined will not false或null将删除该属性，但undefined不会删除该属性
  // 处理下 select 的 multiple 属性，需要使用 setAttribute 方式添加元素
  if (
    vnode.data &&
    vnode.data.attrs &&
    vnode.data.attrs.multiple !== undefined
  ) {
    elm.setAttribute('multiple', 'multiple');
  }
  return elm;
}

// 创建一个具有命名空间的元素
export function createElementNS(namespace: string, tagName: string): Element {
  return document.createElementNS(namespaceMap[namespace], tagName);
}

// 创建一个文本节点
export function createTextNode(text: string): Text {
  return document.createTextNode(text);
}

// 创建一个注释节点
export function createComment(text: string): Comment {
  return document.createComment(text);
}

// 在已有的子节点前插入一个新的子节点。
export function insertBefore(
  parentNode: Node,
  newNode: Node,
  referenceNode: Node
) {
  parentNode.insertBefore(newNode, referenceNode);
}

// 删除指定子节点
export function removeChild(node: Node, child: Node) {
  node.removeChild(child);
}

// 在指定 node 最后插入子节点
export function appendChild(node: Node, child: Node) {
  node.appendChild(child);
}

// 找到指定 node 的父节点
export function parentNode(node: Node): ?Node {
  return node.parentNode;
}

// 查找指定 node 的下一个节点
export function nextSibling(node: Node): ?Node {
  return node.nextSibling;
}

// 返回指定 node 的 tagName - 例如 div 就是 DIV
export function tagName(node: Element): string {
  return node.tagName;
}

// 为 node 设置文本 -- textContent：表示一个节点及其后代的文本内容。
export function setTextContent(node: Node, text: string) {
  node.textContent = text;
}

// 为指定 node 添加一个自定义属性，用于 css 作用域
export function setStyleScope(node: Element, scopeId: string) {
  node.setAttribute(scopeId, '');
}
