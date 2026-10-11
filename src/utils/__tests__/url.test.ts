import { removeUrlParams, setUrlParams } from '../url';

// 把当前地址重置为指定 URL（jsdom 中 replaceState 会同步更新 window.location）
const setLocation = (url: string) => window.history.replaceState(null, '', url);

const currentUrl = () => window.location.pathname + window.location.search;

describe('setUrlParams', () => {
  beforeEach(() => {
    setLocation('/');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('添加新的查询参数', () => {
    setUrlParams([['keyword', 'abc']]);
    expect(currentUrl()).toBe('/?keyword=abc');
  });

  it('一次设置多个参数，结果按 key 字母序排列', () => {
    setUrlParams([
      ['page', '2'],
      ['keyword', 'abc'],
    ]);
    expect(currentUrl()).toBe('/?keyword=abc&page=2');
  });

  it('覆盖已有参数，并保留其他参数', () => {
    setLocation('/?keyword=old&page=1');
    setUrlParams([['keyword', 'new']]);
    expect(currentUrl()).toBe('/?keyword=new&page=1');
  });

  it('使用自定义 basePath', () => {
    setLocation('/search?page=1');
    setUrlParams([['keyword', 'abc']], '/search');
    expect(currentUrl()).toBe('/search?keyword=abc&page=1');
  });

  it('未传 basePath 时路径会被替换为 /', () => {
    setLocation('/search?page=1');
    setUrlParams([['keyword', 'abc']]);
    expect(currentUrl()).toBe('/?keyword=abc&page=1');
  });

  it('参数为空数组时不修改 URL', () => {
    setLocation('/search?page=1');
    const replaceSpy = jest.spyOn(window.history, 'replaceState');

    setUrlParams([]);

    expect(replaceSpy).not.toHaveBeenCalled();
    expect(currentUrl()).toBe('/search?page=1');
  });

  it('参数不是数组时不修改 URL', () => {
    const replaceSpy = jest.spyOn(window.history, 'replaceState');

    setUrlParams(null as unknown as [string, string][]);

    expect(replaceSpy).not.toHaveBeenCalled();
  });
});

describe('removeUrlParams', () => {
  beforeEach(() => {
    setLocation('/');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('删除指定参数，保留其他参数', () => {
    setLocation('/?keyword=abc&page=2');
    removeUrlParams(['keyword']);
    expect(currentUrl()).toBe('/?page=2');
  });

  it('一次删除多个参数', () => {
    setLocation('/?keyword=abc&page=2&size=10');
    removeUrlParams(['keyword', 'size']);
    expect(currentUrl()).toBe('/?page=2');
  });

  it('删除全部参数后 URL 不带 ?', () => {
    setLocation('/?keyword=abc');
    removeUrlParams(['keyword']);
    expect(currentUrl()).toBe('/');
    expect(window.location.href.endsWith('?')).toBe(false);
  });

  it('删除不存在的参数时其他参数保持不变', () => {
    setLocation('/?page=2');
    removeUrlParams(['keyword']);
    expect(currentUrl()).toBe('/?page=2');
  });

  it('使用自定义 basePath', () => {
    setLocation('/search?keyword=abc&page=2');
    removeUrlParams(['keyword'], '/search');
    expect(currentUrl()).toBe('/search?page=2');
  });

  it('删除全部参数且使用自定义 basePath 时只保留路径', () => {
    setLocation('/search?keyword=abc');
    removeUrlParams(['keyword'], '/search');
    expect(currentUrl()).toBe('/search');
  });

  it('参数为空数组时不修改 URL', () => {
    setLocation('/search?keyword=abc');
    const replaceSpy = jest.spyOn(window.history, 'replaceState');

    removeUrlParams([]);

    expect(replaceSpy).not.toHaveBeenCalled();
    expect(currentUrl()).toBe('/search?keyword=abc');
  });

  it('参数不是数组时不修改 URL', () => {
    const replaceSpy = jest.spyOn(window.history, 'replaceState');

    removeUrlParams(undefined as unknown as string[]);

    expect(replaceSpy).not.toHaveBeenCalled();
  });
});
