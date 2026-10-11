import storage from '../storage';

describe('storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('set / get', () => {
    it('存取对象时自动序列化与反序列化', () => {
      const value = { id: 1, title: '三体', tags: ['科幻'] };
      storage.set('book', value);

      expect(localStorage.getItem('book')).toBe(JSON.stringify(value));
      expect(storage.get('book')).toEqual(value);
    });

    it('存取数组', () => {
      storage.set('history', ['a', 'b']);
      expect(storage.get('history')).toEqual(['a', 'b']);
    });
    
    it('同一个 key 再次 set 会覆盖旧值', () => {
      storage.set('key', 1);
      storage.set('key', 2);
      expect(storage.get('key')).toBe(2);
    });

    it('key 不存在时返回 null', () => {
      expect(storage.get('missing')).toBeNull();
    });

    it('存储的是空字符串时返回 null', () => {
      localStorage.setItem('empty', '');
      expect(storage.get('empty')).toBeNull();
    });

    it('存储的内容不是合法 JSON 时抛出异常', () => {
      localStorage.setItem('broken', '{not json');
      expect(() => storage.get('broken')).toThrow(SyntaxError);
    });
  });

  describe('remove', () => {
    it('只删除指定 key', () => {
      storage.set('a', 1);
      storage.set('b', 2);

      storage.remove('a');

      expect(storage.get('a')).toBeNull();
      expect(storage.get('b')).toBe(2);
    });

    it('删除不存在的 key 不报错', () => {
      expect(() => storage.remove('missing')).not.toThrow();
    });
  });

  describe('clear', () => {
    it('清空所有数据', () => {
      storage.set('a', 1);
      storage.set('b', 2);

      storage.clear();

      expect(localStorage.length).toBe(0);
    });
  });
});
