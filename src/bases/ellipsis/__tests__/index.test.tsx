import { fireEvent, render } from '@testing-library/react';
import Ellipsis, { EllipsisProps } from '..';
import { pxToNumber } from '../utils';

const LINE_HEIGHT = 20;
const CHARS_PER_LINE = 10;

// 26 个字符，每行 10 个字符时占 3 行
const TEXT = 'abcdefghijklmnopqrstuvwxyz';

const setup = (props: Partial<EllipsisProps> = {}) => {
  const utils = render(<Ellipsis text={TEXT} {...props} />);
  const root = utils.container.querySelector('.ygm-ellipsis') as HTMLElement;
  return { ...utils, root };
};

// 影子容器里除了正文，最后还带着 "..." 和展开文字
const hiddenNodes = () =>
  Array.from(document.body.children).filter((el) => (el as HTMLElement).style.visibility === 'hidden');

describe('pxToNumber', () => {
  it.each([
    ['20px', 20],
    ['18.5px', 18.5],
    ['0px', 0],
  ])('解析 %s', (value, expected) => {
    expect(pxToNumber(value)).toBe(expected);
  });

  it.each(['normal', '', 'abc'])('无法解析的值 %j 返回 0', (value) => {
    expect(pxToNumber(value)).toBe(0);
  });
});

describe('Ellipsis', () => {
  let lineHeight: number; // getComputedStyle 读到的行高
  let renderedLineHeight: number; // 实际渲染出的每行高度

  beforeEach(() => {
    lineHeight = LINE_HEIGHT;
    renderedLineHeight = LINE_HEIGHT;

    /**
     * jsdom 不做布局，这里模拟一个固定的排版：行高 20px，每行 10 个字符。
     * 这样截断逻辑算出来的结果是确定的。
     */
    const getComputedStyle = window.getComputedStyle.bind(window);
    jest.spyOn(window, 'getComputedStyle').mockImplementation((el) => {
      const style = getComputedStyle(el);
      style.lineHeight = `${lineHeight}px`;
      return style;
    });

    jest.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      const length = (this.innerText ?? '').length;
      return { height: Math.ceil(length / CHARS_PER_LINE) * renderedLineHeight } as DOMRect;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('文本没有超出', () => {
    it('完整显示文本，不显示展开/收起', () => {
      const { root } = setup({ rows: 3, expand: '【expand】', collapse: '【collapse】' });

      expect(root.textContent).toBe(TEXT);
      expect(root.querySelector('a')).toBeNull();
    });

    it('text 为空时不报错', () => {
      const { root } = setup({ text: '' });
      expect(root.textContent).toBe('');
    });

    it('点击不会改变显示内容', () => {
      const { root } = setup({ rows: 3, expand: '【expand】', collapse: '【collapse】' });

      fireEvent.click(root);

      expect(root.textContent).toBe(TEXT);
    });
  });

  describe('文本超出', () => {
    it('默认收起：截断文本，并带上省略号和展开文字', () => {
      const { root } = setup({ rows: 2, expand: '【expand】', collapse: '【collapse】' });

      // 2 行共 20 个字符，要放下 "..." 和 " 展开"（共 6 个字符），正文最多 14 个字符
      expect(root.textContent).toBe('abcdefghijklmn... 【expand】');
    });

    it('rows 决定显示的行数', () => {
      const { root } = setup({ rows: 1, expand: '【expand】' });

      // 1 行 10 个字符，正文最多 4 个字符
      expect(root.textContent).toBe('abcd... 【expand】');
    });

    it('rows 默认为 1', () => {
      const { root } = setup();

      // 没有展开文字，1 行放下 "..." 后，正文最多 7 个字符
      expect(root.textContent).toBe('abcdefg...');
    });

    it('显示的是传入的展开/收起文字，点击在两者之间切换', () => {
      const { root } = setup({ rows: 2, expand: '【expand】', collapse: '【collapse】' });
      expect(root.querySelector('a')!.textContent).toBe(' 【expand】');

      fireEvent.click(root);
      expect(root.textContent).toBe(`${TEXT} 【collapse】`);
      expect(root.querySelector('a')!.textContent).toBe(' 【collapse】');

      fireEvent.click(root);
      expect(root.textContent).toBe('abcdefghijklmn... 【expand】');
    });

    it('只有 expand 时，展开后不能再收起', () => {
      const { root } = setup({ rows: 2, expand: '【expand】' });

      fireEvent.click(root);
      expect(root.textContent).toBe(TEXT);

      fireEvent.click(root);
      expect(root.textContent).toBe(TEXT);
    });

    it('没有 expand 和 collapse 时，点击不切换', () => {
      const { root } = setup({ rows: 2 });
      const before = root.textContent;

      fireEvent.click(root);

      expect(root.textContent).toBe(before);
      expect(root.querySelector('a')).toBeNull();
    });
  });

  it('text 变化时重新计算', () => {
    const { root, rerender } = setup({ rows: 1 });
    expect(root.textContent).toBe('abcdefg...');

    rerender(<Ellipsis text="short" rows={1} />);

    expect(root.textContent).toBe('short');
  });

  it('测量用的影子容器不会留在页面上', () => {
    const { unmount } = setup({ rows: 2, expand: '【expand】' });
    expect(hiddenNodes()).toHaveLength(0);

    unmount();
    expect(hiddenNodes()).toHaveLength(0);
  });
});
