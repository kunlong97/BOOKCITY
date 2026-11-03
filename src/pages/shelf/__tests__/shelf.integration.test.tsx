import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { books, currentUrl, mockApi, readGroups, readShelf, renderApp, seedShelf } from '@/test-utils';
import { IBookInfo } from '@/types/book';

const { orwell, hobbit, farm, gatsby } = books;

const titles = (list: IBookInfo[]) => list.map((book) => book.title);
const ids = (list: IBookInfo[]) => list.map((book) => book.bookId);

// 打开书架页
const openShelf = async (shelfBooks: IBookInfo[] = [], groups: Record<string, IBookInfo[]> = {}) => {
  mockApi();
  seedShelf(shelfBooks, groups);
  const result = renderApp('/shelf');
  await screen.findByText('My Bookshelf');
  return result;
};

const openEditMode = async (shelfBooks: IBookInfo[] = [], groups: Record<string, IBookInfo[]> = {}) => {
  const result = await openShelf(shelfBooks, groups);
  fireEvent.click(screen.getByText('Edit'));
  return result;
};

/**
 * 书架列表里的书名或分组名。
 * 分组名同时出现在书架列表和底部“Move to”弹窗里，这里只取书架列表里的那个
 */
const shelfLabel = (text: string) =>
  Array.from(document.querySelectorAll('.ygm-grid-item .bookName, .ygm-grid-item .groupName')).find(
    (el) => el.textContent === text && !el.closest('.groupPopup'),
  ) as HTMLElement;

// 书架上的一本书或一个分组所在的格子
const gridItemOf = (text: string) => shelfLabel(text).closest('.ygm-grid-item') as HTMLElement;
const clickItem = (text: string) => fireEvent.click(shelfLabel(text));
const selector = (text: string) => gridItemOf(text).querySelector('.icon-selector');
const isSelected = (text: string) => selector(text)?.classList.contains('active');

const bookNames = () => Array.from(document.querySelectorAll('.bookName')).map((el) => el.textContent);
// 书架列表里的分组名（底部“Move to”弹窗里的分组名在 .groupItem 里）
const shelfGroupNames = () =>
  Array.from(document.querySelectorAll('.ygm-grid-item .groupName')).map((el) => el.textContent);

const moveToBar = () => screen.getByText('Move to');
const deleteBar = () => screen.getByText('Delete');
const groupOption = (name: string) => within(document.querySelector('.groupList') as HTMLElement).getByText(name);

const dialogRoot = () => document.querySelector('.ygm-dialog') as HTMLElement;
const dialogInput = () => dialogRoot().querySelector('input') as HTMLInputElement;
const dialogButton = (text: string) => within(dialogRoot()).getByText(text);
const dialogVisible = () => dialogRoot().style.display !== 'none';

// 对话框按钮的回调是异步的
const clickDialogButton = async (text: string) => {
  await act(async () => {
    fireEvent.click(dialogButton(text));
  });
};

const openNewGroupDialog = () => {
  fireEvent.click(moveToBar());
  fireEvent.click(within(document.querySelector('.group') as HTMLElement).getByText('New Group'));
};

describe('书架管理流程', () => {
  describe('展示', () => {
    it('显示书架上的书和分组', async () => {
      await openShelf([orwell, hobbit], { Fantasy: [farm] });

      expect(bookNames()).toEqual(['1984', 'The Hobbit']);
      expect(screen.getAllByText('George Orwell').length).toBeGreaterThan(0);
      expect(shelfGroupNames()).toEqual(['Fantasy']);
    });

    it('书架为空时不显示书和分组，页面正常', async () => {
      await openShelf();

      expect(bookNames()).toEqual([]);
      expect(shelfGroupNames()).toEqual([]);
      expect(screen.getByText('Edit')).toBeTruthy();
    });

    it('localStorage 里没有数据时也能正常打开', async () => {
      mockApi();

      renderApp('/shelf');

      expect(await screen.findByText('My Bookshelf')).toBeTruthy();
      expect(bookNames()).toEqual([]);
    });
  });

  describe('编辑模式', () => {
    it('点 Edit 进入，按钮变成 Finish，书和分组显示选择框', async () => {
      await openShelf([orwell], { Fantasy: [farm] });
      expect(selector('1984')).toBeNull();

      fireEvent.click(screen.getByText('Edit'));

      expect(screen.getByText('Finish')).toBeTruthy();
      expect(selector('1984')).not.toBeNull();
      expect(selector('Fantasy')).not.toBeNull();
    });

    it('点 Finish 退出，选择框消失', async () => {
      await openEditMode([orwell]);

      fireEvent.click(screen.getByText('Finish'));

      expect(screen.getByText('Edit')).toBeTruthy();
      expect(selector('1984')).toBeNull();
    });

    it('点返回时退出编辑模式并回到首页', async () => {
      const { store } = await openEditMode([orwell]);

      fireEvent.click(document.querySelector('.ygm-nav-bar-left') as HTMLElement);

      expect(await screen.findByText('Hot Picks')).toBeTruthy();
      expect(currentUrl()).toBe('/');
      expect(store.getState().Shelf.editMode).toBe(false);
    });

    it('底部操作在没有选中内容时是禁用样式，选中后恢复', async () => {
      await openEditMode([orwell]);
      expect(deleteBar().classList.contains('disable')).toBe(true);
      expect(moveToBar().classList.contains('disable')).toBe(true);

      clickItem('1984');

      expect(deleteBar().classList.contains('disable')).toBe(false);
      expect(moveToBar().classList.contains('disable')).toBe(false);
    });
  });

  describe('选择', () => {
    it('非编辑模式下点书进入详情页', async () => {
      await openShelf([orwell]);

      clickItem('1984');

      expect(await screen.findByText('Add to bookshelf')).toBeTruthy();
      expect(currentUrl()).toBe('/book/book-1');
    });

    it('编辑模式下点书是选中，不跳转；再点取消选中', async () => {
      await openEditMode([orwell, hobbit]);

      clickItem('1984');
      expect(isSelected('1984')).toBe(true);
      expect(isSelected('The Hobbit')).toBe(false);
      expect(currentUrl()).toBe('/shelf');

      clickItem('1984');
      expect(isSelected('1984')).toBe(false);
    });

    it('编辑模式下点分组是选中，再点取消选中', async () => {
      await openEditMode([], { Fantasy: [farm] });

      clickItem('Fantasy');
      expect(isSelected('Fantasy')).toBe(true);

      clickItem('Fantasy');
      expect(isSelected('Fantasy')).toBe(false);
    });
  });

  describe('删除', () => {
    it('删除选中的书，提示成功并退出编辑模式', async () => {
      await openEditMode([orwell, hobbit, farm]);

      clickItem('1984');
      clickItem('Animal Farm');
      fireEvent.click(deleteBar());

      expect(await screen.findByText('Successfully deleted')).toBeTruthy();
      expect(bookNames()).toEqual(['The Hobbit']);
      expect(titles(readShelf())).toEqual(['The Hobbit']);
      expect(screen.getByText('Edit')).toBeTruthy();
    });

    it('删除选中的分组，分组里的书一起删除', async () => {
      await openEditMode([orwell], { Fantasy: [farm], Classic: [gatsby] });

      clickItem('Fantasy');
      fireEvent.click(deleteBar());

      await waitFor(() => expect(shelfGroupNames()).toEqual(['Classic']));
      expect(readGroups()).toEqual({ Classic: [gatsby] });
      expect(bookNames()).toEqual(['1984']);
    });

    it('同时删除书和分组', async () => {
      await openEditMode([orwell, hobbit], { Fantasy: [farm] });

      clickItem('1984');
      clickItem('Fantasy');
      fireEvent.click(deleteBar());

      await waitFor(() => expect(bookNames()).toEqual(['The Hobbit']));
      expect(shelfGroupNames()).toEqual([]);
    });

    it('没有选中内容时点删除，什么也不发生，仍在编辑模式', async () => {
      await openEditMode([orwell]);

      fireEvent.click(deleteBar());

      expect(screen.getByText('Finish')).toBeTruthy();
      expect(bookNames()).toEqual(['1984']);
      expect(screen.queryByText('Successfully deleted')).toBeNull();
    });

    it('删除后再进入编辑模式，没有残留的选中状态', async () => {
      await openEditMode([orwell, hobbit]);

      clickItem('1984');
      fireEvent.click(deleteBar());
      await waitFor(() => expect(bookNames()).toEqual(['The Hobbit']));
      fireEvent.click(screen.getByText('Edit'));

      expect(isSelected('The Hobbit')).toBe(false);
      expect(deleteBar().classList.contains('disable')).toBe(true);
    });
  });

  describe('移动到已有分组', () => {
    it('选中的书移入分组，从书架列表消失，提示成功', async () => {
      const { store } = await openEditMode([orwell, hobbit], { Fantasy: [farm] });

      clickItem('1984');
      fireEvent.click(moveToBar());
      expect(store.getState().Shelf.groupVisibleMode).toBe(true);
      fireEvent.click(groupOption('Fantasy'));

      expect(await screen.findByText('Added to group')).toBeTruthy();
      expect(ids(readGroups().Fantasy)).toEqual(['book-3', 'book-1']);
      expect(titles(readShelf())).toEqual(['The Hobbit']);
      expect(bookNames()).toEqual(['The Hobbit']);
      expect(store.getState().Shelf.groupVisibleMode).toBe(false);
    });

    it('移动后清除选中状态，仍在编辑模式', async () => {
      const { store } = await openEditMode([orwell], { Fantasy: [] });

      clickItem('1984');
      fireEvent.click(moveToBar());
      fireEvent.click(groupOption('Fantasy'));

      await screen.findByText('Added to group');
      expect(store.getState().Shelf.selectedBook).toEqual([]);
      expect(screen.getByText('Finish')).toBeTruthy();
    });

    it('选中其他分组时，合并到目标分组，原分组消失', async () => {
      await openEditMode([], { Fantasy: [farm], Classic: [gatsby] });

      clickItem('Fantasy');
      fireEvent.click(moveToBar());
      fireEvent.click(groupOption('Classic'));

      await waitFor(() => expect(shelfGroupNames()).toEqual(['Classic']));
      expect(ids(readGroups().Classic)).toEqual(['book-4', 'book-3']);
    });

    it('没有选中内容时点分组，提示先选择，数据不变', async () => {
      await openEditMode([orwell], { Fantasy: [farm] });

      fireEvent.click(moveToBar());
      fireEvent.click(groupOption('Fantasy'));

      expect(await screen.findByText('Please choose a book or a group')).toBeTruthy();
      expect(ids(readGroups().Fantasy)).toEqual(['book-3']);
      expect(titles(readShelf())).toEqual(['1984']);
    });
  });

  describe('新建分组', () => {
    it('输入名称提交后创建分组，选中的书移入，提示成功', async () => {
      await openEditMode([orwell, hobbit]);

      clickItem('1984');
      openNewGroupDialog();
      expect(dialogVisible()).toBe(true);
      fireEvent.change(dialogInput(), { target: { value: 'Favorites' } });
      await clickDialogButton('Submit');

      expect(await screen.findByText('Added to group')).toBeTruthy();
      expect(shelfGroupNames()).toEqual(['Favorites']);
      expect(ids(readGroups().Favorites)).toEqual(['book-1']);
      expect(bookNames()).toEqual(['The Hobbit']);
    });

    it('提交后清空输入框和选中状态', async () => {
      const { store } = await openEditMode([orwell]);

      clickItem('1984');
      openNewGroupDialog();
      fireEvent.change(dialogInput(), { target: { value: 'Favorites' } });
      await clickDialogButton('Submit');

      expect(dialogInput().value).toBe('');
      expect(store.getState().Shelf.selectedBook).toEqual([]);
    });

    it('取消时不创建分组，选中状态保留，输入框清空', async () => {
      const { store } = await openEditMode([orwell]);

      clickItem('1984');
      openNewGroupDialog();
      fireEvent.change(dialogInput(), { target: { value: 'Favorites' } });
      await clickDialogButton('Cancel');

      expect(shelfGroupNames()).toEqual([]);
      expect(readGroups()).toEqual({});
      expect(dialogInput().value).toBe('');
      expect(store.getState().Shelf.selectedBook).toHaveLength(1);
    });

    it('打开对话框时，分组选择弹窗关闭', async () => {
      const { store } = await openEditMode([orwell]);

      clickItem('1984');
      openNewGroupDialog();

      expect(store.getState().Shelf.groupVisibleMode).toBe(false);
    });

    it('新建的分组能出现在“Move to”的分组列表里', async () => {
      await openEditMode([orwell, hobbit]);

      clickItem('1984');
      openNewGroupDialog();
      fireEvent.change(dialogInput(), { target: { value: 'Favorites' } });
      await clickDialogButton('Submit');
      await screen.findByText('Added to group');

      clickItem('The Hobbit');
      fireEvent.click(moveToBar());
      fireEvent.click(groupOption('Favorites'));

      await waitFor(() => expect(ids(readGroups().Favorites)).toEqual(['book-1', 'book-2']));
      expect(bookNames()).toEqual([]);
    });
  });

  describe('查看分组', () => {
    const popup = () => document.querySelector('.groupPopup') as HTMLElement;

    it('非编辑模式下点分组，弹出分组里的书', async () => {
      await openShelf([orwell], { Fantasy: [farm, gatsby] });
      expect(within(popup()).queryByText('Animal Farm')).toBeNull();

      clickItem('Fantasy');

      expect(within(popup()).getByText('Animal Farm')).toBeTruthy();
      expect(within(popup()).getByText('The Great Gatsby')).toBeTruthy();
    });

    it('点弹窗里的书进入详情页', async () => {
      await openShelf([], { Fantasy: [farm] });

      clickItem('Fantasy');
      fireEvent.click(within(popup()).getByText('Animal Farm'));

      expect(await screen.findByText('Add to bookshelf')).toBeTruthy();
      expect(currentUrl()).toBe('/book/book-3');
    });

    it('点蒙层关闭弹窗', async () => {
      await openShelf([], { Fantasy: [farm] });
      clickItem('Fantasy');
      const mask = document.querySelector('.ygm-popup .ygm-mask') as HTMLElement;
      expect(mask.style.display).not.toBe('none');

      fireEvent.click(mask);

      await waitFor(() => {
        expect(mask.style.display).toBe('none');
        expect(document.querySelector('.ygm-content')).toBeNull();
      });
    });
  });

  describe('退出编辑时清除选中状态', () => {
    it('点 Finish 后再进入编辑模式，之前选中的书不再是选中状态', async () => {
      const { store } = await openEditMode([orwell, hobbit]);

      clickItem('1984');
      fireEvent.click(screen.getByText('Finish'));
      expect(store.getState().Shelf.selectedBook).toEqual([]);

      fireEvent.click(screen.getByText('Edit'));
      expect(isSelected('1984')).toBe(false);
      expect(deleteBar().classList.contains('disable')).toBe(true);
    });

    it('编辑模式下点返回，选中状态也被清除', async () => {
      const { store } = await openEditMode([orwell]);

      clickItem('1984');
      fireEvent.click(document.querySelector('.ygm-nav-bar-left') as HTMLElement);
      await screen.findByText('Hot Picks');

      expect(store.getState().Shelf.selectedBook).toEqual([]);
      expect(store.getState().Shelf.selectedGroup).toEqual([]);
    });
  });

  describe('新建分组时名称为空', () => {
    it.each([
      ['空字符串', ''],
      ['只有空格', '   '],
    ])('名称为%s时提示输入名称，对话框保持打开，数据不变', async (_label, name) => {
      const { store } = await openEditMode([orwell]);

      clickItem('1984');
      openNewGroupDialog();
      fireEvent.change(dialogInput(), { target: { value: name } });
      await clickDialogButton('Submit');

      expect(await screen.findByText('Please enter a group name')).toBeTruthy();
      expect(dialogVisible()).toBe(true);
      expect(readGroups()).toEqual({});
      expect(bookNames()).toEqual(['1984']);
      expect(store.getState().Shelf.selectedBook).toHaveLength(1);
    });

    it('提示后输入名称再提交，能正常创建分组', async () => {
      await openEditMode([orwell]);

      clickItem('1984');
      openNewGroupDialog();
      await clickDialogButton('Submit');
      await screen.findByText('Please enter a group name');

      fireEvent.change(dialogInput(), { target: { value: 'Favorites' } });
      await clickDialogButton('Submit');

      expect(await screen.findByText('Added to group')).toBeTruthy();
      expect(ids(readGroups().Favorites)).toEqual(['book-1']);
    });
  });

  describe('分组弹窗显示最新数据', () => {
    const popupBookNames = () =>
      Array.from(document.querySelectorAll('.groupPopup .bookName')).map((el) => el.textContent);

    // 模拟其他地方修改了分组（useShelf 写入后会派发这个事件）
    const updateGroups = (groups: Record<string, IBookInfo[]>) =>
      act(() => {
        localStorage.setItem('shelf-group', JSON.stringify(groups));
        window.dispatchEvent(new CustomEvent('local-storage', { detail: { key: 'shelf-group' } }));
      });

    it('弹窗打开期间分组里加了书，弹窗同步显示', async () => {
      await openShelf([], { Fantasy: [farm] });
      clickItem('Fantasy');
      expect(popupBookNames()).toEqual(['Animal Farm']);

      updateGroups({ Fantasy: [farm, gatsby] });

      expect(popupBookNames()).toEqual(['Animal Farm', 'The Great Gatsby']);
    });

    it('弹窗打开期间分组被删除，弹窗变为空', async () => {
      await openShelf([], { Fantasy: [farm] });
      clickItem('Fantasy');

      updateGroups({});

      expect(popupBookNames()).toEqual([]);
    });

    it('切换查看另一个分组时，显示那个分组的书', async () => {
      await openShelf([], { Fantasy: [farm], Classic: [gatsby] });

      clickItem('Fantasy');
      fireEvent.click(document.querySelector('.ygm-popup .ygm-mask') as HTMLElement);
      clickItem('Classic');

      expect(popupBookNames()).toEqual(['The Great Gatsby']);
    });
  });

  it('在详情页加入书架后，书架页能看到这本书', async () => {
    mockApi();
    renderApp('/book/book-1');

    fireEvent.click(await screen.findByText('Add to bookshelf'));
    await screen.findByText('Added to bookshelf');
    window.history.pushState(null, '', '/shelf');
    fireEvent.popState(window);

    expect(await screen.findByText('My Bookshelf')).toBeTruthy();
    expect(bookNames()).toEqual(['1984']);
  });
});
