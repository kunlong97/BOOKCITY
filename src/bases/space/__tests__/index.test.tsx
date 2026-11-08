import { render } from '@testing-library/react';
import Space from '..';

const spaceOf = (container: HTMLElement) => container.querySelector('.ygm-space') as HTMLElement;

describe('Space', () => {
  describe('gap', () => {
    it('数字按 px 处理', () => {
      const { container } = render(<Space gap={12}>a</Space>);
      expect(spaceOf(container).style.getPropertyValue('--gap')).toBe('12px');
    });

    it('字符串原样使用', () => {
      const { container } = render(<Space gap="0.32rem">a</Space>);
      expect(spaceOf(container).style.getPropertyValue('--gap')).toBe('0.32rem');
    });

    it('数组分别设置水平、垂直间距', () => {
      const { container } = render(<Space gap={[20, '1rem']}>a</Space>);
      const space = spaceOf(container);
      expect(space.style.getPropertyValue('--gap-horizontal')).toBe('20px');
      expect(space.style.getPropertyValue('--gap-vertical')).toBe('1rem');
    });
  });
});
