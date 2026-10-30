import { Popup } from '@/bases';
import { useAppSelector } from '@/store/store';
import React, { useContext, useRef, useState } from 'react';
import styles from './index.module.scss';
import cx from 'classnames';
import { useNavigate, useParams } from 'react-router-dom';
import BookDetailContext from '@/features/bookDetail/context';
import Slider, { SliderRef } from '@/bases/slider';

const ChapterFooterProgressBar: React.FC = React.memo(() => {
  const navigate = useNavigate();
  const { bookId, chapterId } = useParams();

  const sliderRef = useRef<SliderRef>(null);

  const footerProgressBarVisible = useAppSelector<boolean>((state) => state.Chapter.footerProgressBarVisible);

  const [currentPageIndex, setCurrentPageIndex] = useState<number>(Number(chapterId));

  // 书籍数据由 ChapterFooter 统一请求、通过 Context 下发，这里不再自己发请求。
  const book = useContext(BookDetailContext);
  const isFirst = currentPageIndex === 1;
  const isLast = currentPageIndex === book?.chapters?.length;

  const onPrev = () => {
    if (isFirst) return;
    const newIndex = currentPageIndex - 1;
    setCurrentPageIndex(newIndex);
    navigate(`/book/${bookId}/${newIndex}`, { replace: true });
    sliderRef.current?.setValue(newIndex); // 同步滑块位置
  };
  const onNext = () => {
    if (isLast) return;
    const newIndex = currentPageIndex + 1;
    setCurrentPageIndex(newIndex);
    navigate(`/book/${bookId}/${newIndex}`, { replace: true });
    sliderRef.current?.setValue(newIndex); // 同步滑块位置
  };

  //滑动滑块时更新显示的章节数
  const onChange = (value: number) => {
    setCurrentPageIndex(value);
  };

  //滑动结束后跳转到指定章节,更新显示的章节数
  const onChangeAfter = (value: number) => {
    navigate(`/book/${bookId}/${value}`, { replace: true });
    setCurrentPageIndex(value);
  };

  return (
    <Popup position="bottom" visible={footerProgressBarVisible} mask={false}>
      <div className={styles.progress}>
        <div className={styles.progressVal}>{`chapter ${currentPageIndex}`}</div>
        <div className={styles.progressBar}>
          <div className={cx(styles.prev, { [styles.disable]: isFirst })} onClick={onPrev}>
            Prev Chapter
          </div>
          <div className={styles.slider}>
            <Slider
              ref={sliderRef}
              value={currentPageIndex}
              min={1}
              max={book?.chapters?.length}
              onChange={onChange}
              onChangeAfter={onChangeAfter}
            />
          </div>
          <div className={cx(styles.next, { [styles.disable]: isLast })} onClick={onNext}>
            Next Chapter
          </div>
        </div>
      </div>
    </Popup>
  );
});

export default ChapterFooterProgressBar;
