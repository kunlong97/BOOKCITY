# ranking 页面重构 —— 面试复盘笔记

> **后续更新**：这份笔记里描述的"男生/女生"顶部 tab，在这次重构完成后又被
> 产品需求整个移除了（排行榜改成只展示男生榜单，侧边栏直接点选）——
> `rankingSlice`、`TABS`、`RankingHeader` 里的 `Tabs` 组件都已经删除。
> 下面记录的 bug 和修复过程仍然成立、仍然值得讲（尤其是 `Sidebar` 组件"看起来
> 受控、实际不受控"这个根因，跟有没有顶部 tab 无关，是这次顺手修正的通用问题）
> ——只是现在打开代码已经看不到 tab 切换这个触发场景了。面试时如果被问起，
> 说清楚这一点：**这个 bug 是在 tab 功能还存在的时候发现并修复的，tab 功能
> 本身是后来才被移除的产品决策**，不要把时间线讲混。

ranking 的 Redux 崩溃问题在 search 那次重构里已经顺带修过（挂在断联 store 上
的问题，两个页面是同一个根因，一起修的），但整个页面没有单独认真看过。这次
专门过一遍，找到的不是又一个"重复请求"问题（虽然也确实有），而是一个跨了两层
——业务代码和共享 UI 组件库——的真实交互 bug。

## 1. 表层问题：Ranking 和 RankingContent 重复请求同一个接口

```ts
// Ranking/index.tsx（重构前）
const { data, error } = useRequest({ url: api.ranking });   // 注意：没有类型参数

// RankingContent（重构前）
const { data } = useRequest<IRanking>({ url: api.ranking }); // 又请求一次，这次有类型
```

跟 detail、home 重构前是同一类问题：`RankingContent` 是 `Ranking` 的直接子
组件，中间没有穿透层，所以处理方式跟 home 一样——建一个 `useRanking` Feature
Hook，`Ranking` 请求一次，把 `data` 当 props 传给 `RankingContent`，不用
Context。顺带把 `Ranking` 自己那处缺类型参数的调用也一起修了。这部分是这次
最不值得花时间讲的一半，为的是给后面真正的 bug 铺路。

## 2. 真正的 bug：切换"男生/女生"顶部 tab，侧边栏选中状态不会重置

### 2.1 现象

`RankingContent` 里侧边栏选中的 `activeKey`，只在组件挂载时算了一次：

```ts
const [activeKey, setActiveKey] = useState<string>(data![TAB_DEFAULT_KEY][0].key);
```

`TAB_DEFAULT_KEY` 恒为 `'male'`，这行代码只在挂载那一刻取"男生榜单第一项"的
key 当初始值。之后 `activeKey` 只会因为用户点击侧边栏项（`onChange`）而改变，
跟顶部"男生/女生" tab 切换（`selectorTabKey`，来自 Redux）完全没有关联。

男生榜单有 4 项（key `001`~`004`：最热榜/畅销榜/热搜榜/潜力榜），女生榜单只有
1 项（key `001`：最热榜）。查 mock 数据（`api-now/db.json`）确认过这个不对称
是真实存在的，不是我编的场景。

复现路径：在男生榜里点开非第一项，比如"畅销榜"（key `002`）→ `activeKey`
变成 `002` → 切到"女生" tab → 侧边栏只剩"最热榜"一项（key `001`）→
`activeKey` 还停在 `002`，跟当前唯一一项对不上。

### 2.2 只修 `RankingContent` 不够，问题还在更底层的 `Sidebar` 组件里

第一反应是给 `RankingContent` 加一个 `useEffect`，监听 `selectorTabKey` 变化
时重置 `activeKey`。但查 `bases/sidebar/sidebar.tsx` 才发现，就算这样修，
UI 也不会跟着变——`Sidebar` 长得像一个受控组件（外部传 `activeKey`、传
`onChange`），实际实现是：

```tsx
// 重构前
const [activeKey, setActiveKey] = React.useState<string>(props.activeKey);
```

只在挂载时把 `props.activeKey` 当初始值抄一份到自己的内部 state，之后完全
不看外部传进来的新 `activeKey`，只靠内部点击（`onSetActive` 里的
`setActiveKey`）更新。外部组件重新传一个不同的 `activeKey` 进来，`Sidebar`
根本不会重新渲染出新的选中状态——这是"只受控一次、以后不受控"的经典误用，
本质上和 `DetailFooter` 那次 `isShelf(data![0].bookId)`、`RankingContent`
自己这次的 `activeKey` 初始化是同一类问题的又一次出现：**用 `useState` 存了
一份本该由外部实时同步的状态，只在某个时间点对了一次，之后就再也没人保证它
和真正的数据源一致**。

之所以重构前"看起来正常"，纯粹是因为男生榜单和女生榜单的**第一项** key 恰好
都是 `"001"`——只要用户没有手动点开过男生榜的第 2/3/4 项，`activeKey` 从
挂载到现在都还停留在 `"001"`，切到女生 tab 时这个巧合让 bug 没有暴露出来。
这是这个项目里第 N 次出现"代码本身是错的，只是恰好没被撞见"的情况。

### 2.3 怎么修的

**根因在 `Sidebar`，所以从根上改**——把它改成真正的受控组件，删掉内部那份
多余的 state，直接用 `props.activeKey` 渲染：

```tsx
// 重构后
const onSetActive = (e) => {
  const key = ...;
  props.onChange?.(key);   // 只通知，不自己维护状态
};
// 渲染时直接用 props.activeKey 判断哪一项是 active、哪个内容面板要显示
```

`Sidebar` 现在只做两件事：根据 `props.activeKey` 渲染当前该显示成什么样、
用户点击时通过 `onChange` 把选中的 key 报告给调用方——"要不要真的切换选中项"
这个决定权完全交给外部，组件自己不再攒状态。这是"受控组件"最基本的定义，
之前的实现只是长得像。

**`RankingContent` 这边补上顶部 tab 切换时重置 `activeKey` 的逻辑**：

```ts
useEffect(() => {
  setActiveKey(ranking[selectorTabKey][0].key);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [selectorTabKey]);
```

依赖数组只放 `selectorTabKey`，故意不放 `ranking`——`ranking` 这个 prop 引用
可能因为 SWR 后台重新验证而变化（内容完全一样，只是新对象），如果把它也放进
依赖数组，每次静默的后台刷新都会把用户刚选好的项目重置回第一项，这是比"切
tab 不重置"更烦人的另一种体验问题，没必要为了"依赖数组写全"而引入。

`Sidebar` 是共享 UI 组件（`bases/`），这次改动前确认过全项目只有 ranking
这一处在用它，改动的影响面是可控的。

## 3. 顺手修的第三件事：`rank_female_001` 的 404，之前诊断错了

验证上面两个改动时，切到女生 tab 后内容区确实开始显示"选中"状态了，但书籍
列表本身还是空的——`BookList` 请求 `rank_female_001` 返回 404。

上次（search 重构那次）的笔记里把这个 404 归因于"`vite.config.js` 代理规则
只写了 `rank_male_00[1-4]`，没有 female 规则"，这次重新查证发现**这个诊断是
错的**：`vite.config.js` 里本来就有一条 `/rank` 前缀规则（`'/rank': {
target: 'http://localhost:3002' }`），`rank_female_001` 完全匹配这条前缀，
请求确实被正确代理到了本地 mock 服务——是 `api-now/db.json` 里压根没有定义
`rank_female_001` 这个 key，json-server 收到请求后自己返回的 404，跟 Vite
代理配置无关。

已经把之前那条错误记录标注更正（见
[search-dual-store-and-cache-key.md](search-dual-store-and-cache-key.md)
第 6 节），并且在 `api-now/db.json` 里补上了 `rank_female_001` 这份 mock
数据（复用了项目里已经存在的三本书，没有编造新的图片资源）。

这件事本身比 bug 更值得记住：**上次那条诊断只是"看了一眼 vite.config.js
觉得像"，没有去 db.json 里实际确认过就写进了笔记**。这次要是没有因为专门
重构 ranking 而重新触发这条路径，这个错误诊断可能会一直留在笔记里，面试时
如果被追问"给我看看那个 vite.config.js 的问题具体在哪一行"，是会当场露馅的。

## 4. 预设追问与思路

- **"`Sidebar` 内部那份 `useState` 是不是完全没用，能不能直接删掉？"**
  是的，删掉之后行为反而更符合它对外暴露的 `SidebarProps` 类型描述的语义
  （`activeKey` 说的是"当前激活面板的 key"，理应是外部说了算，不是组件自己
  记一份"上次算出来的"）。这次的改动就是把内部 state 整个删掉，不是"多加一步
  同步逻辑"——受控组件不需要自己的状态，这是判断"这份 state 到底该不该存在"
  的一个通用信号：如果一个组件的某个状态完全可以由 props 表达、且外部本来就
  在通过 onChange 拿到变化通知，这份内部 state 就是多余的，只会成为不同步的
  来源。

- **"为什么不是反过来，让 Sidebar 保留内部 state，但加一个 useEffect 监听
  props.activeKey 变化去同步？"**
  技术上可以，社区里也有这种"内部 state 初始化自 props、之后用 effect 跟
  外部同步"的模式（叫 derived state from props），但这里没有必要用这么
  复杂的方案——`Sidebar` 并不需要在"外部受控"和"内部维护一份独立状态"之间
  切换着用，它的两个使用场景（用户点击、外部传入新 activeKey）本质上都是
  "activeKey 变了"，直接读 `props.activeKey` 就能覆盖两种场景，没有必要为了
  一个不存在的需求（同一个组件实例既要受控又要不受控）引入额外的同步逻辑。

- **"这次改了一个共享的 bases/sidebar 组件，怎么确定没有影响到其他页面？"**
  改动前先 grep 过项目里所有 `Sidebar`/`bases/sidebar` 的引用，确认全项目
  只有 ranking 这一处在用；改完之后重新过了一遍浏览器验证（点击切换侧边栏
  项、切换性别 tab、确认选中状态和内容区都对得上）。如果 `Sidebar` 当时被
  两个以上页面复用，这次的改动理论上还是对的（修的是它没有正确实现"受控组件"
  这个基本契约，不是改语义），但验证的范围就得覆盖所有使用方，不能只测
  ranking 一个页面。

- **"如果两个性别榜单的所有 key 都不重叠（不像现在这样第一项恰好都是
  '001'），这个 bug 会不会更早被发现？"**
  会。这也是这次特意把"男生榜单有 4 项、女生只有 1 项"这个真实的数据不对称
  记下来的原因——bug 能不能被"自然而然"地发现，很大程度上取决于测试数据的
  覆盖面。如果当初写测试或者手动验收的人只点了默认的第一项就切换 tab，或者
  两边榜单恰好用了完全一致的 key 集合，这个 bug 会一直隐藏下去。这也是为什么
  这次验证的时候特意选了"畅销榜"（男生榜第二项，key 002）而不是默认的
  "最热榜"（key 001）来复现——用默认路径走一遍是测不出这个问题的。

## 5. 改动文件清单

- 新增 `src/pages/ranking/hooks/useRanking.ts`
- `src/pages/ranking/index.tsx` —— 改用 `useRanking`，把 `ranking` 当 props
  传给 `RankingContent`
- `src/pages/ranking/components/content/index.tsx` —— 不再自己请求，接收
  `ranking` prop；新增按 `selectorTabKey` 重置 `activeKey` 的 `useEffect`
- `src/bases/sidebar/sidebar.tsx` —— 删掉内部多余的 `useState`，改成真正的
  受控组件
- `api-now/db.json` —— 补上缺失的 `rank_female_001` mock 数据
- `docs/interview-notes/search-dual-store-and-cache-key.md` —— 更正上次
  对 `rank_female_00X` 404 原因的错误诊断

## 6. 还没做的事（准备面试时不要回避）

- 只补了 `rank_female_001` 这一份 mock 数据，因为目前女生榜单在
  `/ranking` 接口里也确实只定义了这一项（`key: "001"`）——如果以后女生
  榜单也扩展到 4 项，对应的 `rank_female_002`~`004` 还是需要补
- `BookList` 组件（`ranking/components/booklist`）本身没有 loading/error
  态，请求还没返回时内容区是空白，不是这次改动的范围，重构前就是这样
- 没有为 `useRanking`、`Sidebar` 改动后的受控行为写自动化测试——这次的
  验证是浏览器里手动点击复现 bug、确认修复，属于回归测试思路，不是能长期
  留在代码库里跑的用例
