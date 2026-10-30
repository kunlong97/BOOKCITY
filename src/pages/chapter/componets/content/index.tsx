import React, { useEffect, useRef } from 'react';
import styles from './index.module.scss';
import { useAppDispatch, useAppSelector } from '@/store/store';
import { setFooterProgressBarVisible, setFooterSettingBarVisible, setFooterVisible, setHeaderVisible } from '../../chapterSlice';
import { NIGHT_THEME, NIGHT_THEME_TEXT_COLOR } from '../constants';
import { useNavigate, useParams } from 'react-router-dom';
import useRequest from '@/hooks/useRequest/useRequest';
import { IChapterContent, IChapterInfo } from '@/types/book';
import api from '../../api';
import { Button, ErrorBlock } from '@/bases';
import Loading from '@/components/loading';

const ChapterContent: React.FC = React.memo(() => {
  const navigate = useNavigate();
  const { bookId, chapterId } = useParams();
  const { error, data: chapters } = useRequest<IChapterInfo[]>({
    url: api.getChapter(bookId as string),
  });

  const { data } = useRequest<IChapterContent[]>({ url: api.getChapterContent(chapterId as string) });

  const contentRef = useRef<HTMLDivElement>(null);

  const dispatch = useAppDispatch();
  const headerVisible = useAppSelector<boolean>((state) => state.Chapter.headerVisible); //控制顶部导航的显示与隐藏
  const footerVisible = useAppSelector<boolean>((state) => state.Chapter.footerVisible);
  const nightTheme = useAppSelector<boolean>((state) => state.Chapter.nightTheme); //控制夜间与日间模式
  const theme = useAppSelector<string>((state) => state.Chapter.theme); //控制主题颜色
  const fontSize = useAppSelector<number>((state) => state.Chapter.fontSzie); //控制字号大小

  //顶部和底部导航的显示与隐藏
  const onContent = () => {
    dispatch(setHeaderVisible(!headerVisible));
    dispatch(setFooterVisible(!footerVisible));
    dispatch(setFooterProgressBarVisible(false));
    dispatch(setFooterSettingBarVisible(false));
  };

  const renderChapter = (chapterInfo: IChapterInfo, data: IChapterContent[]) => {
    return (
      <div key={chapterInfo.bookId}>
        <h1>{chapterInfo.chapterContent[Number(chapterId) - 1].chapterName}</h1>
        {data?.map((item) => {
          return item.paragraphs.map((content, index) => <p key={index}>{content}</p>);
        })}
      </div>
    );
  };

  const onPrev = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    e.stopPropagation();
    if (isFirst) return;
    navigate(`/book/${bookId}/${Number(chapterId) - 1}`, { replace: true });
    dispatch(setHeaderVisible(false));
    dispatch(setFooterVisible(false));
  };

  const onNext = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    e.stopPropagation;
    if (isLast) return;
    navigate(`/book/${bookId}/${Number(chapterId) + 1}`, { replace: true });
    dispatch(setHeaderVisible(false));
    dispatch(setFooterVisible(false));
  };

  const isFirst = Number(chapterId) === 1; //是否为第一章
  const isLast = Number(chapterId) === chapters?.[0]?.chapterContent?.length; //是否为最后一章

  useEffect(() => {
    const element = contentRef.current;
    if (!element) return;
    element.scrollTop = 0; //页面回到顶部
  });

  if (!chapters) {
    return <Loading />;
  }

  if (error || !chapters?.length) {
    return <ErrorBlock />;
  }

  return (
    <div
      className={styles.content}
      onClick={onContent}
      ref={contentRef}
      style={{
        background: nightTheme ? NIGHT_THEME : theme,
        fontSize: fontSize,
        color: nightTheme ? NIGHT_THEME_TEXT_COLOR : '',
      }}
    >
      {chapters.map((chapterInfo) => renderChapter(chapterInfo, data as IChapterContent[]))}

      <div className={styles.pagination}>
        <Button onClick={onPrev}>Prev Chapter</Button>
        <Button onClick={onNext}>Next Chapter</Button>
      </div>
    </div>
  );
});

export default ChapterContent;
