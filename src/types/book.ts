export interface IBookInfo {
  author: string;
  bookId: string;
  categoryName: string;
  coverImg: string;
  desc: string;
  title: string;
  wordCount?: number;
  isSerial?: boolean;
  minorCate?: string;
  chapters?: string[];
  chapterInfo?: IChapterInfo;
}

export interface IChapterInfo {
  bookId: string;
  chapterContent: [IChapterMessage];
  content:string[];
}

export interface IChapterMessage{
  chapterId: string;
  chapterIndex: number;
  chapterName: string;
}

export interface IChapterContent {
  chapterId: number;
  paragraphs: string[];
}
