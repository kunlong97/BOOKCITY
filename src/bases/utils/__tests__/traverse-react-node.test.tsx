import React from 'react';
import { traverseReactNode } from '../traverse-react-node';

// 收集遍历到的节点和下标
const collect = (children: React.ReactNode) => {
  const nodes: React.ReactNode[] = [];
  const indexes: number[] = [];
  traverseReactNode(children, (child, index) => {
    nodes.push(child);
    indexes.push(index);
  });
  return { nodes, indexes };
};

const keysOf = (nodes: React.ReactNode[]) => nodes.map((node) => (node as React.ReactElement).key);

describe('traverseReactNode', () => {
  it('遍历多个子元素，下标从 0 开始递增', () => {
    const { nodes, indexes } = collect([<div key="a" />, <div key="b" />, <div key="c" />]);

    expect(keysOf(nodes)).toEqual(['a', 'b', 'c']);
    expect(indexes).toEqual([0, 1, 2]);
  });

  it('只有一个子元素时也会遍历', () => {
    const child = <div />;
    expect(collect(child).nodes).toEqual([child]);
  });

  it('文本和数字节点也会遍历，包括数字 0 和空字符串', () => {
    expect(collect(['text', 1, 0, '']).nodes).toEqual(['text', 1, 0, '']);
  });

  it('跳过 null、undefined 和布尔值，且不占用下标', () => {
    const { nodes, indexes } = collect([<div key="a" />, null, undefined, true, false, <div key="b" />]);

    expect(keysOf(nodes)).toEqual(['a', 'b']);
    expect(indexes).toEqual([0, 1]);
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['false', false],
    ['空数组', []],
  ])('children 为 %s 时不调用回调', (_label, children) => {
    expect(collect(children).nodes).toEqual([]);
  });

  describe('Fragment', () => {
    it('展开 Fragment 的子元素，Fragment 本身不算节点', () => {
      const { nodes, indexes } = collect(
        <>
          <div key="a" />
          <div key="b" />
        </>,
      );

      expect(keysOf(nodes)).toEqual(['a', 'b']);
      expect(indexes).toEqual([0, 1]);
    });

    it('展开多层嵌套的 Fragment，保持原有顺序，下标连续', () => {
      const { nodes, indexes } = collect(
        <>
          <div key="a" />
          <>
            <div key="b" />
            <>
              <div key="c" />
            </>
          </>
          <div key="d" />
        </>,
      );

      expect(keysOf(nodes)).toEqual(['a', 'b', 'c', 'd']);
      expect(indexes).toEqual([0, 1, 2, 3]);
    });

    it('空 Fragment 不调用回调', () => {
      expect(collect(<></>).nodes).toEqual([]);
    });

    it('Fragment 里的 null 同样被跳过', () => {
      const { nodes } = collect(
        <>
          {null}
          <div key="a" />
          {false}
        </>,
      );

      expect(keysOf(nodes)).toEqual(['a']);
    });
  });

  it('不会展开普通元素的子节点', () => {
    const { nodes } = collect(
      <div key="parent">
        <span />
      </div>,
    );

    expect(keysOf(nodes)).toEqual(['parent']);
  });

  it('每次调用的下标都从 0 开始', () => {
    collect([<div key="a" />, <div key="b" />]);

    expect(collect([<div key="c" />]).indexes).toEqual([0]);
  });
});
