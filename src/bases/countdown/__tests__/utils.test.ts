import { getTimeItems } from '../utils';

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe('getTimeItems', () => {
  it('按 hh:mm:ss 拆分时间并补零', () => {
    expect(getTimeItems('hh:mm:ss', HOUR + 2 * MINUTE + 3 * SECOND)).toEqual([
      { num: '01', symbol: ':' },
      { num: '02', symbol: ':' },
      { num: '03', symbol: undefined },
    ]);
  });

  it('两位数不补零', () => {
    expect(getTimeItems('hh:mm:ss', 12 * HOUR + 34 * MINUTE + 56 * SECOND).map((i) => i.num)).toEqual([
      '12',
      '34',
      '56',
    ]);
  });

  it('剩余时间为 0 时全部显示 00', () => {
    expect(getTimeItems('hh:mm:ss', 0).map((i) => i.num)).toEqual(['00', '00', '00']);
  });

  it('剩余时间为负数时显示 00', () => {
    expect(getTimeItems('hh:mm:ss', -5 * SECOND).map((i) => i.num)).toEqual(['00', '00', '00']);
  });

  it('不足一秒的毫秒被舍去', () => {
    expect(getTimeItems('ss', 999).map((i) => i.num)).toEqual(['00']);
  });

  it('包含 dd 时按天拆分', () => {
    expect(getTimeItems('dd天hh时mm分ss秒', 2 * DAY + 3 * HOUR + 4 * MINUTE + 5 * SECOND)).toEqual([
      { num: '02', symbol: '天' },
      { num: '03', symbol: '时' },
      { num: '04', symbol: '分' },
      { num: '05', symbol: '秒' },
    ]);
  });

  it('格式中没有 dd 时，天数合并到小时', () => {
    expect(getTimeItems('hh:mm:ss', DAY + 2 * HOUR).map((i) => i.num)).toEqual(['26', '00', '00']);
  });

  it('格式中没有 hh 时，小时合并到分钟', () => {
    expect(getTimeItems('mm:ss', 2 * HOUR + 3 * MINUTE + 4 * SECOND).map((i) => i.num)).toEqual(['123', '04']);
  });

  it('格式中只有 ss 时，全部合并为秒', () => {
    expect(getTimeItems('ss', 2 * MINUTE + 5 * SECOND).map((i) => i.num)).toEqual(['125']);
  });

  it('空格式返回空数组', () => {
    expect(getTimeItems('', HOUR)).toEqual([]);
  });
});
