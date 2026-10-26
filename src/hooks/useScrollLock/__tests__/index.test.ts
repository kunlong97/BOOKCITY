import { renderHook } from '@testing-library/react';
import useScrollLock from '..';

const html = document.documentElement;

const lockWith = (visible: boolean) =>
  renderHook(({ visible }) => useScrollLock(visible), { initialProps: { visible } });

describe('useScrollLock', () => {
  afterEach(() => {
    html.style.overflow = '';
  });

  it('visible 为 true 时锁定，变为 false 时解除', () => {
    const { rerender } = lockWith(true);
    expect(html.style.overflow).toBe('hidden');

    rerender({ visible: false });
    expect(html.style.overflow).toBe('');
  });

  it('visible 为 false 时不锁定', () => {
    lockWith(false);
    expect(html.style.overflow).toBe('');
  });

  it('卸载时解除锁定', () => {
    const { unmount } = lockWith(true);

    unmount();

    expect(html.style.overflow).toBe('');
  });

  it('解除时恢复页面原有的 overflow 值', () => {
    html.style.overflow = 'scroll';
    const { unmount } = lockWith(true);
    expect(html.style.overflow).toBe('hidden');

    unmount();

    expect(html.style.overflow).toBe('scroll');
  });

  describe('多处同时锁定', () => {
    it('最后一处解除前保持锁定，全部解除后恢复', () => {
      const a = lockWith(true);
      const b = lockWith(true);

      a.rerender({ visible: false });
      expect(html.style.overflow).toBe('hidden');

      b.rerender({ visible: false });
      expect(html.style.overflow).toBe('');
    });

    it('按"后开先关"的顺序解除，同样能恢复', () => {
      const a = lockWith(true);
      const b = lockWith(true);

      b.unmount();
      expect(html.style.overflow).toBe('hidden');

      a.unmount();
      expect(html.style.overflow).toBe('');
    });

    it('恢复的是第一次锁定前的值，而不是中间的 hidden', () => {
      html.style.overflow = 'auto';
      const a = lockWith(true);
      const b = lockWith(true);

      a.unmount();
      b.unmount();

      expect(html.style.overflow).toBe('auto');
    });

    it('同一处反复切换不会让计数失衡', () => {
      const a = lockWith(true);
      a.rerender({ visible: false });
      a.rerender({ visible: true });
      a.rerender({ visible: false });

      expect(html.style.overflow).toBe('');

      const b = lockWith(true);
      expect(html.style.overflow).toBe('hidden');
      b.unmount();
      expect(html.style.overflow).toBe('');
    });
  });
});
