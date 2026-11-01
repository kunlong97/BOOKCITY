import { isPromise } from '../validate';

describe('isPromise', () => {
  describe('返回 true', () => {
    it('Promise 实例', () => {
      expect(isPromise(new Promise(() => undefined))).toBe(true);
    });

    it('已完成和已拒绝的 Promise', () => {
      const rejected = Promise.reject(new Error('fail'));
      rejected.catch(() => undefined); // 避免未处理的拒绝

      expect(isPromise(Promise.resolve(1))).toBe(true);
      expect(isPromise(rejected)).toBe(true);
    });

    it('async 函数的返回值', () => {
      const load = async () => 'data';
      expect(isPromise(load())).toBe(true);
    });

    it('带 then 方法的对象（duck-typing）', () => {
      expect(isPromise({ then: () => undefined })).toBe(true);
    });
  });

  describe('返回 false', () => {
    it.each([
      ['null', null],
      ['undefined', undefined],
      ['数字', 1],
      ['0', 0],
      ['字符串', 'promise'],
      ['空字符串', ''],
      ['布尔值', true],
    ])('%s', (_label, value) => {
      expect(isPromise(value)).toBe(false);
    });

    it('普通对象和数组', () => {
      expect(isPromise({})).toBe(false);
      expect(isPromise([])).toBe(false);
    });

    it('then 不是函数的对象', () => {
      expect(isPromise({ then: 'not a function' })).toBe(false);
      expect(isPromise({ then: null })).toBe(false);
    });
  });
});
