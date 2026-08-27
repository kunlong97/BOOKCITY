# search 页面重构 —— 面试复盘笔记

第五个页面选的是 search（搜索页），出发点是"这个项目还没有一个场景涉及用户高频输入
触发请求"——但真正动手之后发现，search 页面**在浏览器里直接崩溃、白屏**，问题比
预想的严重得多，而且不止 search 一个页面中招。这份笔记记的是两个独立的问题：一个是
让页面完全不能用的 Redux 架构问题，一个是原本打算讲的 SWR 缓存 key 问题。

## 1. 更严重的问题：两套并存、互不相通的 Redux store

### 1.1 是怎么发现的

打开 `/search`，浏览器控制台直接抛出
`TypeError: Cannot read properties of undefined (reading 'searchKeyword')`，整个
页面白屏。往上查：

- [App.tsx](src/App.tsx) 里 `<Provider store={store}>` 用的是当时叫
  `store1.ts` 的那个文件（后文统一称它为"真正的 store"，修复完成后已经
  重命名为 `store.ts`，见第 5 节）—— `configureStore({ reducer: { Shelf, Chapter } })`，
  只注册了 `Shelf`、`Chapter` 两个 slice。
- 但 search 页面用的是另一套完全独立的机制：[store/store.ts](src/store/store.ts)
  （已删除）是用 `configStore` + `createReducerManager` 实现的"动态注入 reducer"
  方案，配合 `store/hooks.ts`（已删除）的 `useReducer(reducers)`，让页面挂载时把
  自己的 reducer 动态塞进去。`pages/search/store.ts`（已删除）在这套机制上创建了
  一个 `search` reducer，`Search` 页面组件调用 `useReducer(reducers)` 把它注入进去。

问题是：`useReducer` 注入的目标是 `store.ts` 里那个**独立创建的 store 对象**，
这个对象从来没有被 `<Provider>` 使用过——`useSelector`/`useDispatch` 是靠 React
Context 找到真正挂载的 store（也就是 `store1`），跟你从哪个文件 import 这两个函数
毫无关系。`useReducer` 往一个孤立的、没人订阅的 store 里加了半天 reducer，React
树里实际渲染用的 `store1` 从头到尾都不知道有 `search` 这个 key 存在。于是
`useSelector((state) => state.search.searchKeyword)` 里的 `state.search` 永远是
`undefined`。

而且这个项目哪里都没有 Error Boundary，一崩就是整个 React 根节点被卸载，连客户端
路由都跟着失效——不只是 search 这一个页面挂了，是打开过 search 之后整个 SPA 都不能用
了，得强制刷新才能恢复。

### 1.2 排查发现同样的问题也出现在 ranking 页面

`grep` 了一下所有 `import ... from '@/store'`（不是 `@/store/store1`）的地方，
发现 `pages/ranking` 用的是一模一样的模式（`ranking/store.ts` 用 `createTempSlice`，
`Ranking` 组件调 `useReducer`）。浏览器实测，`/ranking` 同样会抛
`Cannot read properties of undefined (reading 'activeTabKey')`，同样白屏。

这已经不是"search 页面的问题"，是这套"动态注入 reducer"方案本身就是废弃状态——
第一次探索这个仓库的时候就记录过 `store.ts` 是"未被使用"的方案，但没意识到
"未被使用"应该更精确地描述成"被两个页面用了，但因为接的不是真正的 store，所以
用了等于没用，而且用了还会崩"。这次修复得到用户确认后一起处理了 search 和 ranking
两个页面，不是分两次改。

### 1.3 怎么修的

思路很直接：让 search、ranking 跟 shelf、chapter 一样，用**静态注册**的方式把
自己的 reducer 加进 `store1`，不再依赖那套没有真正生效的动态注入机制。

- 新建 [pages/search/searchSlice.ts](src/pages/search/searchSlice.ts)、
  [pages/ranking/rankingSlice.ts](src/pages/ranking/rankingSlice.ts)，用
  `createSlice` 直接定义，跟 `shelfSlice.ts`/`chapterSlice.ts` 是同一个写法
- `store1.ts`（现在的 [store.ts](src/store/store.ts)）里注册 `Search: searchReducer`、
  `Ranking: rankingReducer`（大写开头的 key，跟 `Shelf`/`Chapter` 保持一致——
  重构前 search/ranking 用的是小写 `search`/`ranking`，这次统一了写法）
- 两个页面组件不再需要 `useReducer(reducers)` 这行代码——store1 是应用启动时
  一次性创建好的，reducer 不需要"挂载时才注入"
- 所有子组件的 `useAppSelector`/`useAppDispatch` 统一改成从
  `@/store/store1` 导入
- 删除整套动态注入机制：`store/store.ts`、`configStore.ts`、
  `createReducerManager.ts`、`createTempSlice.ts`、`hooks.ts`、`index.ts`，
  以及 `pages/search/store.ts`、`pages/ranking/store.ts`——确认没有其他地方
  再依赖它们之后整体删除，不是只删 search 用到的部分

顺手还发现 `store1.ts` 自己也有同样性质的小毛病：
`useAppDispatch` 的类型标注用的是 `import { AppDispatch } from "./store"`——
也就是说 `store1` 给自己的 dispatch 打类型标注时，用的是**另一个 store** 的类型。
这次改成了 `type AppDispatch = typeof store.dispatch`，从 `store1` 自己身上推导，
不再依赖那个即将被删除的文件。

### 1.4 为什么选择"迁移到 store1"而不是"把 store1 也接入动态注入机制"

技术上也可以反过来做：让 `App.tsx` 改用 `store.ts` 那个支持动态注入的 store，
把 `shelf`、`chapter` 的静态 reducer 也迁过去，保留"按需注入 reducer、组件卸载时
移除"这个更精细的代码分割能力。没有选这条路，原因是成本和收益不对等：

- `shelf`、`chapter` 两个页面已经在用 `store1` 的静态注册方式跑得好好的，反过来改
  意味着要重新触碰两个已经验证过、稳定工作的页面，风险明显更高
- 项目目前的路由级代码分割已经通过 `React.lazy` 实现了（见
  [routers/index.tsx](src/routers/index.tsx)），"reducer 要不要跟着页面一起
  动态加载"带来的收益在当前的应用规模下并不明显
- 动态注入机制本身的实现是对的（`createReducerManager` 那套 add/remove reducer
  的逻辑没有 bug），问题出在"实现了但没有真正接入 `<Provider>`"——这更像是一次
  没写完的重构，而不是一个值得继续投入的方向

一句话：不是"静态注册"天然比"动态注入"更好，是**两个已经在用的页面 + 更低的
风险，胜过一个写了一半、且已经导致两个页面崩溃的方案**。

### 1.5 后续：`store1.ts` 改名为 `store.ts`

这次修复删掉了那个孤立的旧 `store.ts` 之后，`store1.ts` 就是仓库里唯一的
store 了——文件名里的"1"从"跟另一个 store 区分"变成了没有意义的历史包袱。
后来把它重命名成了 `store.ts`，同步改了所有 import 路径。这份笔记里凡是提到
"store1"，指的都是这个文件重命名之前的名字；提到当时那个已删除的孤立
`store.ts`，指的是完全不同的另一个文件——两者曾经同时存在过，这也是这个 bug
最初能发生的原因。

## 2. 原本要讲的问题：`useRequest` 的 SWR 缓存 key 没把 params 算进去

搜到 search 页面能跑起来之后，才轮到最初想讲的问题。

[SearchList](src/pages/search/components/searchList/index.tsx) 重构前是这样：

```ts
const { data, error, mutate } = useRequest<IBookInfo[]>({
  url: api.getSearchList,
  params: { q: searchKeyword },
});

useEffect(() => {
  if (searchKeyword) {
    mutate(); //手动触发请求,重新获取
  }
}, [mutate, searchKeyword]);
```

[useRequest.ts](src/hooks/useRequest/useRequest.ts) 内部把 SWR 的缓存 key
写死成 `request.url`（一个字符串），完全没把 `params` 算进去。这意味着不管
`searchKeyword` 是什么，SWR 看到的都是同一个 key（`/bookList`），感知不到
"关键词变了、这其实是个不同的请求"——SWR 自己"key 变了就重新请求"的机制在这里
根本没被触发过，`SearchList` 只能自己在 `useEffect` 里手动 `mutate()` 硬顶上去。

这个手动触发和 SWR 本该自动完成的事是两套逻辑，会带来一个真实的竞态问题：搜索
"hello" 后很快又搜 "world"，两次 `mutate()` 打在同一个缓存条目上，谁的响应后到
谁就赢——如果 "hello" 网络慢，后到达，用户会看到关键词已经是 "world" 了，结果
列表里显示的却是 "hello" 的搜索结果。

### 2.1 怎么修的

给 `useRequest` 加了一个 `buildKey` 函数，把 `params` 序列化进 key：

```ts
function buildKey(request: AxiosRequestConfig | null): string | null {
  if (!request?.url) return null;
  if (!request.params) return request.url;
  return `${request.url}?${JSON.stringify(request.params)}`;
}
```

不同关键词现在对应不同的缓存条目，SWR 自己就会在 key 变化时重新请求——`SearchList`
里那段手动 `useEffect` + `mutate()` 整段删掉了。竞态问题也顺带解决：不是靠取消
请求解决的，是每个关键词有自己独立的缓存槽位，哪怕旧关键词的响应晚到，它更新的是
**它自己那个 key 的缓存**，不会覆盖当前正在显示的、新关键词对应的那份数据。

### 2.2 顺手支持了"不发请求"

`buildKey` 在 `request` 为 `null` 时返回 `null`，SWR 遇到 `null` key 会跳过这次
请求（SWR 官方的 conditional fetching 用法）。这让 `useRequest` 的入参类型从
`AxiosRequestConfig` 放宽成 `AxiosRequestConfig | null`：

```ts
const { data, error } = useRequest<IBookInfo[]>(
  searchKeyword ? { url: api.getSearchList, params: { q: searchKeyword } } : null
);
```

重构前，哪怕用户还没输入任何关键词，`SearchList` 一挂载就会立刻发一次
`/bookList?q=`，靠外层 `searchMode` 把结果藏起来，白白打一次接口。现在关键词是
空的时候 key 就是 `null`，请求根本不会发出去。这个改动对其余十几个不带 `params`
的 `useRequest` 调用方完全透明——它们只是碰巧一直传的是非 `null` 的对象，行为
没有变化。

## 3. 加上打字防抖

前两个问题修完之后，search 页面本身已经能正常搜索了，但交互还是"回车才搜"——
不支持边打字边看结果。这一步是后来单独加的：把"打字触发搜索"这条路径接进来，
并且专门设计成不影响前面已经修好的东西。

### 3.1 防抖只应该管"发请求"这一件事，不应该管"UI 反馈"

如果把"切换到搜索态（隐藏热搜/历史，显示结果区）"也放进防抖回调里，用户打字的
前 300ms 会经历一段"界面没有任何反应"的空白期，体验会变差。所以拆成了两条独立
的路径：

```ts
const onChange = (value: string) => {
  if (!value) { ... }
  dispatch(setSearchMode(true));   // 立即执行，不等防抖
  debouncedSearch(value);          // 防抖只包这一部分：写 URL、真正触发搜索
};
```

`setSearchMode(true)` 立即 dispatch，用户一开始打字，热搜/历史立刻让位给结果区
（此时结果区会因为 `searchKeyword` 还没更新而显示 Loading）；真正"发请求"这件事
（`setSearchKeyword` 触发 `useRequest` 重新求值）被 `debouncedSearch` 推迟到
用户停止输入 300ms 之后。防抖应该只包住"代价高的操作"（发请求），不应该连带着
拖慢"代价低的操作"（切换 UI 状态）的反馈速度。

### 3.2 防抖路径不写历史记录

```ts
const [debouncedSearch, cancelDebouncedSearch] = useDebouncedCallback((value: string) => {
  setUrlParams([['keyword', value]], 'search');
  dispatch(setSearchKeyword(value));   // 注意：没有调用 setHistory
}, SEARCH_DEBOUNCE_MS);
```

如果打字过程中的每个停顿点都写一条历史记录，用户搜索"Harry Potter"这一次操作，
"搜索历史"里可能会多出"Harry"、"Harry P"这种不完整的中间状态——这不是用户想要
留存的东西。历史记录只在明确的"提交"动作里写：回车（`onSearch`）、点击热搜标签、
点击历史记录本身，这几个动作都是用户主动选定了一个完整关键词，语义上跟"打字打到
一半自动停顿"是不同的两件事，不应该共用一条写入路径。

### 3.3 两处需要主动取消防抖定时器的地方

写这个功能时最容易漏掉的不是"怎么防抖"，是"什么时候要提前取消掉那个还没触发的
定时器"：

- **清空输入框**：如果用户打了几个字又立刻删掉，此时防抖定时器可能还没触发。
  不取消的话，300ms 后这个已经被用户放弃的搜索会"复活"，把刚刚清空的界面又
  拽回搜索结果页。
- **按下回车**：回车本身就是立即触发搜索，不需要等防抖；如果不取消，防抖定时器
  依然会在 300ms 后触发一次内容相同的 `dispatch`——虽然值相同、不会造成错误的
  结果，但这是一次没有意义的多余更新，`cancelDebouncedSearch()` 一行代码就能
  避免。

`useDebouncedCallback` 因此设计成返回一个 `[debounced, cancel]` 元组而不是只
返回防抖函数本身——如果只暴露防抖函数，组件层面就没有办法表达"我要主动作废
这次还没触发的调用"，只能眼睁睁看着它稍后触发。

### 3.4 浏览器实测验证

- 连续快速触发 5 次 `input`（模拟连续打字）只产生 1 次网络请求，且请求用的是
  最后一次输入的值，不是中间任何一个片段
- "热门搜索"区块的 `hidden` class 在第一次 `input` 事件后立刻出现，不等 300ms
- 打字后立刻清空，等待超过 300ms，确认没有任何新的搜索请求发出、页面正确停留
  在非搜索态
- 回车提交后，`localStorage` 里的搜索历史立刻写入；防抖路径产生的搜索则完全不
  出现在历史记录里

## 4. 预设追问与思路

- **"两个 store 并存这种情况，编译期为什么没有报错？"**
  TypeScript 检查的是"这次 `useSelector` 调用传入的 selector 函数类型对不对"，
  而 `state.search.searchKeyword` 之所以能通过编译，是因为 `state` 的类型来自
  `store/hooks.ts` 里 `TypedUseSelectorHook<AppState>` 这个类型标注——`AppState`
  正是从那个孤立的 `store.ts` 推导出来的，类型系统里确实存在 `search` 这个 key
  （因为 `store.ts` 的 reducerManager 类型上"应该"支持任意注入的 key）。类型对得上，
  但类型描述的是那个从未真正 mount 的 store，运行时状态对不上——这是"类型系统只能
  保证类型内部自洽，不能保证类型描述的东西和运行时真的是同一个对象"的一个具体例子。

- **"为什么用 `JSON.stringify(request.params)` 拼 key，而不是更标准的
  `URLSearchParams`？"**
  `URLSearchParams` 要求值是字符串，这个项目里 `params` 目前只有 `{ q: string }`
  一种形状，用哪个都能工作；但 `useRequest` 是通用 hook，未来别的调用方 `params`
  里完全可能出现数字、布尔值。`JSON.stringify` 对任意可序列化的值都成立，不需要
  为了"更像一个真正的 URL"而牺牲通用性——这个 key 只是给 SWR 内部拿来做 Map 的
  key 用，不需要长得像真的查询字符串，能唯一标识"这是不是同一个请求"就够了。

- **"改完之后 useRequest 的入参变成可以传 null，会不会影响其他已经在用它的十几个
  地方？"**
  不会。`AxiosRequestConfig | null` 是把原来的类型放宽了，其他调用方一直传的是
  具体的对象字面量，从类型层面看仍然完全合法；运行时 `buildKey` 只在传 `null`
  时才返回 `null`，其余情况和重构前的行为一致。这次浏览器实测过 detail、chapter、
  bookList 几个页面，确认没有回归。

- **"防抖时间定的 300ms，这个数字怎么来的？"**
  没有为这个项目专门测过，是搜索类交互里一个常见的经验值——短到用户感觉不出
  明显延迟，长到能有效合并连续几次按键。真要精确调，应该看真实用户的打字速度
  分布和后端接口的响应时间，而不是拍脑袋定一个"更科学"的数字；先用经验值上线，
  之后有真实数据了再调整，比这次为了选一个"更精确"的数字而去猜测用户行为更
  务实。

- **"为什么 `useDebouncedCallback` 要把 `callback` 存进 `ref` 而不是直接放进
  `useCallback` 的依赖数组？"**
  如果依赖数组里放 `callback`，`searchKeyword` 或者其他状态一变化导致组件
  重新渲染时，`onChange` 里定义的箭头函数会是一个新的引用，`useCallback` 会
  据此生成一个新的防抖函数——而生成新函数这件事本身不会清掉旧函数身上还没触发
  的定时器，等于每次渲染都在"偷偷"开一个新的防抖计时链条，旧的定时器完全失控。
  用 `ref` 存最新的 `callback`、只让 `delay` 决定要不要重新生成防抖函数，才能
  保证同一个防抖函数实例在输入过程中被稳定复用，定时器的取消/重置逻辑才有意义。

## 5. 改动文件清单

- 新增 `src/pages/search/searchSlice.ts`、`src/pages/ranking/rankingSlice.ts`
- `src/store/store1.ts`（后来重命名为 `store.ts`，见第 1.5 节）—— 注册 `Search`、
  `Ranking` 两个 reducer；`AppDispatch` 类型改为从自身推导
- 删除 `src/store/{store.ts, configStore.ts, createReducerManager.ts,
  createTempSlice.ts, hooks.ts, index.ts}`（整套未真正生效的动态注入机制——
  这里的 `store.ts` 是当时那个孤立的旧文件，不是后来重命名后的那个）
- 删除 `src/pages/search/store.ts`、`src/pages/ranking/store.ts`
- `src/pages/search/index.tsx`、`searchBar`、`searchList`、`searchHot`、
  `searchHistory` —— 改用 `searchSlice` + 真正的 store
- `src/pages/ranking/index.tsx`、`components/header`、`components/content` ——
  改用 `rankingSlice` + 真正的 store
- `src/pages/shelf` 下 3 个文件、`src/pages/chapter/componets/content/index.tsx`
  —— 把残留的 `import ... from '@/store'`（指向孤立旧 store 的类型）统一改成
  指向真正的 store，避免继续绑定即将删除的类型
- `src/hooks/useRequest/useRequest.ts` —— 缓存 key 计入 `params`，支持传
  `null` 跳过请求
- `src/hooks/useDebouncedCallback/index.ts`（新增）+
  `src/pages/search/components/searchBar/index.tsx` —— 给搜索框加上打字防抖，
  见第 3 节

## 6. 还没做的事（准备面试时不要回避）

- ~~ranking 页面切到"女生"tab 后 `BookList` 子组件请求 `rank_female_00X` 会
  404，是 `vite.config.js` 代理规则的缺口~~——**这个诊断是错的**，后来专门
  重构 ranking 页面时查证过：`vite.config.js` 里 `/rank` 这条前缀规则本来就
  能匹配到 `rank_female_00X`，问题其实是 `api-now/db.json` 里压根没有
  `rank_female_001` 这个 mock 数据集合，请求被正确代理到本地 mock 服务后，
  是 json-server 自己因为找不到这个 key 返回的 404。已经在 ranking 那次
  重构里把 mock 数据补上并修复，详见
  [ranking-controlled-sidebar.md](ranking-controlled-sidebar.md)。这里保留
  这条记录是为了提醒自己：**没有实际验证过的诊断，哪怕看起来合理，也不能
  当结论写进笔记**——上次这个判断只是"看了一眼 vite.config.js 觉得像"，
  没有去 db.json 里确认过。
- 没有为 `searchSlice`/`rankingSlice`、`useRequest` 新增的 `buildKey`
  逻辑、或者 `useDebouncedCallback` 写单元测试
- `SearchBar`（[bases/search-bar](src/bases/search-bar/index.tsx)）内部对中文
  输入法有做处理，但只用在回车事件上（`composingRef` 只挡住了 `onEnterPress`），
  `onChange` 本身在输入法组合输入（拼音上屏之前）的过程中一样会触发。也就是说
  用中文输入法打字时，防抖计时器可能会在还没选字、只是中间拼音状态的时候被
  触发一次搜索——不算错误，只是会多打一次不必要的请求。要彻底解决需要在
  `SearchBar` 组件层面把 `composingRef` 的状态也通过 `onChange` 暴露出去，
  这次没有动这个更底层的组件
- 我这边测试用的 `json-server` 实际解析到的是 `1.0.0-beta.15`（项目
  `package.json` 锁定的是 `^0.17.4`，但 `node_modules` 里没有真正装这个包），
  搜索关键词能不能命中数据跟这个版本差异有关，不是这次改动引入的问题，只是
  记录一下这个环境差异，避免后面被误判成新 bug
