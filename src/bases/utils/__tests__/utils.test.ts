import { getValueByScope } from '../utils';

describe('getValueByScope', () => {
  it('值在范围内时原样返回', () => {
    expect(getValueByScope(50, 0, 100)).toBe(50);
  });

  it.each([
    [0, 0],
    [100, 100],
  ])('值等于边界 %i 时返回边界值', (value, expected) => {
    expect(getValueByScope(value, 0, 100)).toBe(expected);
  });

  it('小于最小值时返回最小值', () => {
    expect(getValueByScope(-1, 0, 100)).toBe(0);
  });

  it('大于最大值时返回最大值', () => {
    expect(getValueByScope(101, 0, 100)).toBe(100);
  });

  it('支持非 0 起点的范围（字号滑块 14~28）', () => {
    expect(getValueByScope(0, 14, 28)).toBe(14);
    expect(getValueByScope(18, 14, 28)).toBe(18);
    expect(getValueByScope(30, 14, 28)).toBe(28);
  });

  it('支持负数范围', () => {
    expect(getValueByScope(-5, -10, -1)).toBe(-5);
    expect(getValueByScope(-20, -10, -1)).toBe(-10);
    expect(getValueByScope(0, -10, -1)).toBe(-1);
  });

  it('保留小数，不做取整', () => {
    expect(getValueByScope(18.5, 14, 28)).toBe(18.5);
  });

  it('最小值和最大值相等时，始终返回该值', () => {
    expect(getValueByScope(0, 5, 5)).toBe(5);
    expect(getValueByScope(10, 5, 5)).toBe(5);
  });

  it('Infinity 也会被限制在范围内', () => {
    expect(getValueByScope(Infinity, 0, 100)).toBe(100);
    expect(getValueByScope(-Infinity, 0, 100)).toBe(0);
  });
});
