const api = {
  getChapter: (bookId: string) => `/chapterInfoDetail?bookId=${bookId}`,
  getChapterContent:(chapterId: string) => `/chapterContent?chapterId=${chapterId}`,

};

export default api;
