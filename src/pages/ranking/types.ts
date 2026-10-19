export interface IRankingItem {
  id: number; // 榜单唯一 ID
  key: string; // 榜单的 key，用于 Sidebar 的 activeKey 匹配
  title: string; // 榜单完整标题
  cover: string; // 榜单封面图 URL
  shortTitle: string; // 榜单短标题，用于侧边栏菜单展示
}

export type IRanking = IRankingItem[];
