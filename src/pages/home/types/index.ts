import { IBookInfo } from '@/types/book';

export interface IRanking {
  id: string;
  title: string;
  books: IBookInfo[];
}

export interface Ibanner {
  src: string;
  alt: string;
}

export interface IHomeData {
  banner: Ibanner[];
  limited: IBookInfo[];
  popular: IBookInfo[];
  ranking: IRanking[];
  recommend: IBookInfo[];
}
