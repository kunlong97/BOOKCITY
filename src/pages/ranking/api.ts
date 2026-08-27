const api = {
  ranking: '/ranking',
  getBookList: ({ gender, key }: { gender: 'male' | 'female'; key: string }) =>
    `/rank_${gender}_${key}`,
};

export default api;
