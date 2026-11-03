import { IBookInfo } from '@/types/book';

/**
 * 集成测试用的小份数据，结构和 api-now/db.json 一致。
 * 用例需要特殊数据时，通过 mockApi({ '/xxx': ... }) 覆盖对应接口即可。
 */
const createBook = (id: number, title: string, author: string, categoryName: string): IBookInfo => ({
  bookId: `book-${id}`,
  title,
  author,
  categoryName,
  coverImg: `/images/book-${id}.png`,
  desc: `Description of ${title}`,
  wordCount: 320,
  isSerial: false,
  chapters: ['Chapter 1', 'Chapter 2', 'Chapter 3', 'Chapter 4', 'Chapter 5'].map((name) => `${name} of ${title}`),
});

export const books = {
  orwell: createBook(1, '1984', 'George Orwell', 'Dystopian Fiction'),
  hobbit: createBook(2, 'The Hobbit', 'J.R.R. Tolkien', 'Fantasy'),
  farm: createBook(3, 'Animal Farm', 'George Orwell', 'Satire'),
  gatsby: createBook(4, 'The Great Gatsby', 'F. Scott Fitzgerald', 'Classic Fiction'),
};

export const allBooks = Object.values(books);

export const homeData = {
  banner: [
    { src: '/images/banner1.png', alt: 'banner 1' },
    { src: '/images/banner2.png', alt: 'banner 2' },
  ],
  limited: [books.farm],
  popular: [books.orwell, books.hobbit],
  ranking: [
    { id: 'rank_1', title: 'Top Rated', books: [books.gatsby] },
    { id: 'rank_2', title: 'Most Read', books: [books.hobbit] },
  ],
  recommend: [books.gatsby, books.farm],
};

export const hotSearches = ['The Hobbit', 'Animal Farm', 'Moby-Dick'];

export const categories = [
  { id: '001', name: 'Mystery & Thriller', bookCount: 239, bookCover: '/images/category1.png' },
  { id: '002', name: 'Science & Fantasy', bookCount: 472, bookCover: '/images/category2.png' },
];

export const rankings = [
  { id: 1, key: '001', title: '最热榜', cover: '', shortTitle: 'Popular List' },
  { id: 2, key: '002', title: '畅销榜', cover: '', shortTitle: 'Bestseller list' },
];

export const chapterIntro = {
  chapterId: '',
  chapterIndex: '',
  chapterName: '',
  content: ['First paragraph of the chapter.', 'Second paragraph of the chapter.'],
};

export const chapterDetails = allBooks.map((book) => ({
  bookId: book.bookId,
  chapterContent: book.chapters!.map((chapterName, index) => ({
    chapterId: `${index + 1}`,
    chapterIndex: index + 1,
    chapterName,
  })),
}));

export const chapterContents = [1, 2, 3, 4, 5].map((id) => ({
  chapterId: `${id}`,
  paragraphs: [`Paragraph one of chapter ${id}.`, `Paragraph two of chapter ${id}.`],
}));
