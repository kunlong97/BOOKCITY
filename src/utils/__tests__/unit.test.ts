import { px2rem } from '../unit';

describe('px2rem', () => {
  it('按 375 设计稿（1rem = 37.5px）换算', () => {
    expect(px2rem(37.5)).toBe('1rem');
    expect(px2rem(75)).toBe('2rem');
  });

  it('项目里常用的尺寸', () => {
    expect(px2rem(12)).toBe('0.32rem');
    expect(px2rem(24)).toBe('0.64rem');
    expect(px2rem(300)).toBe('8rem');
  });

  it('除不尽时保留完整的小数，换算回 px 仍是原值', () => {
    const rem = parseFloat(px2rem(200));

    expect(px2rem(200)).toMatch(/^5\.333+rem$/);
    expect(rem * 37.5).toBeCloseTo(200);
  });

  it('0 换算为 0rem', () => {
    expect(px2rem(0)).toBe('0rem');
  });

  it('支持小数和负数', () => {
    expect(px2rem(0.75)).toBe('0.02rem');
    expect(px2rem(-37.5)).toBe('-1rem');
  });

  it('结果可以直接用作 CSS 长度值', () => {
    const el = document.createElement('div');

    el.style.width = px2rem(75);

    expect(el.style.width).toBe('2rem');
  });
});
