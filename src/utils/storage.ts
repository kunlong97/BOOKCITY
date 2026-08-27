const storage = {
  //从本地存储中取出数据
  get(key: string) {
    const json: string | null = localStorage.getItem(key);
    if (json) {
      return JSON.parse(json);
    }
    return null;
  },

  //保存数据到本地存储中
  set(key: string, value: unknown) {
    localStorage.setItem(key, JSON.stringify(value));
  },

  //删除本地存储中的数据
  remove(key: string) {
    localStorage.removeItem(key);
  },

  //清空本地存储中的数据
  clear() {
    localStorage.clear();
  },
};

export default storage;
