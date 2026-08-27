export interface IRankingItem {
  id: string; // 榜单唯一 ID
  key: string; // 榜单的 key，用于 Sidebar 的 activeKey 匹配
  title: string; // 榜单完整标题
  cover: string; // 榜单封面图 URL
  shortTitle: string; // 榜单短标题，用于侧边栏菜单展示
}

export interface IRanking {
  male: IRankingItem[]; // 男频榜单列表
  female: IRankingItem[]; // 女频榜单列表
}
