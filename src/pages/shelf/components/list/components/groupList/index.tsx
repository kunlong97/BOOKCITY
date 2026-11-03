import styles from './index.module.scss';
import { Grid, Popup } from '@/bases';
import BookCover from '@/components/bookCover/bookCover';
import useShelf from '@/features/shelf/hooks/useShelf';
import { setSelectedGroup } from '@/pages/shelf/shelfSlice';
import { useAppDispatch } from '@/store/store';
import { useAppSelector } from '@/store/store';
import { IBookInfo } from '@/types/book';
import { px2rem } from '@/utils/unit';
import { memo, useState } from 'react';
import cx from 'classnames';
import BookList from '../bookList';

const GroupList: React.FC = memo(() => {
  // 重构前这里的默认值是 `|| []`——数组，但声明的类型是 Record<string, IBookInfo[]>，
  // 类型和运行时默认值对不上，只是因为 Object.keys([]) 恰好也是 []，没有在这里炸出来。
  // useShelf 统一成 `{}`，类型和实际值一致。
  const { groups: groupList } = useShelf();

  const dispatch = useAppDispatch();
  const editMode = useAppSelector((state) => state.Shelf.editMode);
  const selectedGroup = useAppSelector((state) => state.Shelf.selectedGroup);

  const [visible, setVisible] = useState<boolean>(false); //控制底部分组框的显示与隐藏
  // 只记住打开的是哪个分组，书籍列表每次从最新的 groupList 里读取，
  // 弹窗打开期间分组内容变化时也能同步显示
  const [openGroupName, setOpenGroupName] = useState<string>('');
  const bookList: IBookInfo[] = groupList[openGroupName] || [];

  const onGroup = (groupName: string) => {
    // "编辑"模式,点击分组,选中/删除分组
    if (editMode) {
      dispatch(setSelectedGroup(groupName));

    // 非"编辑"模式,点击分组,弹出分组框,显示该分组下的书籍
    } else {
      setVisible(true);
      setOpenGroupName(groupName);
    }
  };

  // 判断分组是否被选中
  const getGroupActive = (groupName: string) => {
    return selectedGroup.includes(groupName);
  };

  return (
    <>
      {Object.keys(groupList).map((groupName: string) => {
        return (
          <Grid.Item key={groupName} onClick={() => onGroup(groupName)}>
            <div className={styles.group}>
              <Grid columns={2} gap={px2rem(5)}>
                {groupList[groupName]?.map((book) => (
                  <Grid.Item key={book.bookId}>
                    <BookCover
                      src={book.coverImg}
                      alt={book.title}
                      style={{ '--width': px2rem(40), '--height': px2rem(57) }}
                    />
                  </Grid.Item>
                ))}
              </Grid>
              {editMode && (
                <i className={cx('icon-selector', styles.icon, { [styles.active]: getGroupActive(groupName) })} />
              )}
            </div>
            <div className={styles.groupName}>{groupName}</div>
          </Grid.Item>
        );
      })}
      <Popup visible={visible} position="bottom" className={styles.groupPopup} onMaskClick={() => setVisible(false)}>
        <Grid columns={3} gap={px2rem(20)}>
          <BookList bookList={bookList} />
        </Grid>
      </Popup>
    </>
  );
});

export default GroupList;
