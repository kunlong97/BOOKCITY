# detail 页面重构 —— 面试复盘笔记

这是继 bookList 之后的第二个页面。选它是因为它暴露的问题和 bookList 完全不是一类：
bookList 的问题是"一个请求怎么分页、怎么转换数据"，detail 的问题是**同一份数据在组件树
里被独立请求了 6 次**，以及由此滋生出的两个真实 bug。两次重构都用了"API 层 transform"
这个模式，但 detail 这次多解决了一类新问题，值得单独拿出来讲。

## 1. 重构前的问题（都是看代码看出来的，不是编的）

`Detail`（`pages/detail/index.tsx`）下面挂了 `DetailHeader → DetailNavbar / DetailBookInfo
/ Catalog`、`DetailContent`、`DetailFooter`，一共 6 个组件，**每一个都自己调用了一遍**
`useRequest({ url: api.getBook(id) })`：

```
Detail (useRequest 请求 1 次)
├─ DetailHeader（不请求，只是个壳）
│   ├─ DetailNavbar   (useRequest 请求第 2 次)
│   ├─ DetailBookInfo (useRequest 请求第 3 次)
│   └─ Catalog        (useRequest 请求第 4 次)
├─ DetailContent       (useRequest 请求第 5 次)
└─ DetailFooter        (useRequest 请求第 6 次)
```

因为请求 key（url）完全相同，SWR 会按 key 去重，**实际网络请求只发一次**，这也是这段代码
"看起来能跑"的原因。但请求逻辑被复制了 6 遍，除此之外还挖出三个真实问题：

1. **类型不一致**：`index.tsx` 把这个接口的返回值类型标成 `IBookInfo`（单个对象），
   其余 5 处都标成 `IBookInfo[]`（数组）。两边不可能同时是对的——查了 `api-now/db.json`
   确认 `/book?bookId=xxx` 是 json-server 的过滤查询，返回的永远是数组。`index.tsx` 的类型
   是错的，只是因为那里从没访问过具体字段（只判断真假），错误类型才没有暴露成运行时问题。

2. **error 判断顺序反了，请求失败会卡死在 Loading**：
   ```ts
   if(!data){ return <Loading /> }
   if(error){ return <ErrorBlock /> }
   ```
   SWR 请求失败时 `data` 永远不会变成真值，所以 `!data` 恒为 `true`，`error` 判断永远走
   不到。也就是说重构前只要 `/book?bookId=xxx` 请求失败，用户看到的是一个转不出结果的
   加载动画，而不是错误提示——这个分支代码写了，但从来没被执行到过。

3. **`DetailFooter` 里的非空断言全靠巧合成立**：
   ```ts
   const { data } = useRequest<IBookInfo[]>({ url: api.getBook(id) });
   const [shelfMode, setShelfMode] = useState<boolean>(isShelf(data![0].bookId));
   ```
   `data!` 只是让 TypeScript 不报错，运行时 `data` 首次渲染必然是 `undefined`。它没有
   崩，纯粹是因为 `DetailFooter` 只有在 `Detail` 页面自己的 `useRequest`（同一个 key）
   已经成功、`Detail` 已经渲染出子树之后才会挂载，这时候 SWR 缓存里已经有数据了。这个
   前提**没有写在代码的任何地方**，纯粹是"父组件恰好用了同一个 key、恰好先加载完"的巧合。
   如果哪天 `DetailFooter` 被挪到别的、不经过这层 gate 的地方复用，就会立刻抛出
   `Cannot read properties of undefined (reading '0')`。

## 2. 重构后的结构

```
Page (index.tsx)
  用 useBookDetail 发起唯一一次请求，loading/error 判断完之后
  用 <BookDetailContext.Provider value={data}> 包裹子树
      │
      ▼
Feature Hook (hooks/useBookDetail.ts)
  页面级别唯一一处调用 useRequest 的地方
      │
      ▼
API 层 (api.ts) —— transformBookDetail(dto) => dto[0]
  把"过滤查询返回数组"这个实现细节解包成"一本书"
      │
      ▼
6 个子组件都改成 useBookDetailContext()，不再各自请求
```

## 3. 关键设计决策

### 3.1 为什么用 Context，而不是把 book 一路当 props 传下去？

`DetailHeader` 自己不需要 `book` 数据，它只是把 `DetailNavbar`/`DetailBookInfo`/`Catalog`
组合在一起的一个壳。如果用 props 透传，`DetailHeader` 也要被迫接一个自己用不上的 `book`
prop 再转发下去——这就是经典的 prop drilling：中间层因为下面有人要用，被迫携带一份自己
不关心的数据。而且 `DetailFooter`、`DetailContent` 和 `DetailHeader` 是平级关系，用 props
没法从 `Detail` 直接"跨过" `DetailHeader` 传给它们。Context 正是为"数据被树上多个不同深度
的节点消费，中间节点又不关心它"这种场景设计的。

> bookList 页面数据只有一层消费者（Page 自己），不存在这个问题，所以那次没用到 Context——
> 两次用不同方案不是风格不统一，是问题形状不一样。

### 3.2 为什么 `useBookDetailContext` 的返回类型敢标成 `IBookInfo`（非空），而不是 `IBookInfo | undefined`？

```ts
export function useBookDetailContext(): IBookInfo {
  const book = useContext(BookDetailContext);
  if (!book) {
    throw new Error('useBookDetailContext must be used within <BookDetailContext.Provider>');
  }
  return book;
}
```

`Detail/index.tsx` 只有在 `loading`/`error` 判断都通过之后才会渲染
`<BookDetailContext.Provider>`，所以这棵子树内部理论上不可能读到 `null`。这里没有
偷懒直接把 `useContext` 的原始返回值（`IBookInfo | null`）暴露出去，而是包一层：读到
`null` 就直接 `throw`，把"必须在 Provider 内使用"这条约束从一个隐含的、靠巧合成立的
前提，变成一条一旦被违反就会在开发阶段立刻报错的显式规则。这和重构前 `data![0]` 的
本质区别：**同样是"我假设数据一定存在"，一个是用类型断言把风险埋起来，一个是把假设
写成运行时会主动报警的检查**。

### 3.3 两个真实 bug 是顺手改的，不是重构的主要目的

error 判断顺序、`DetailFooter` 的非空断言，这两个问题只是在"把 6 处请求收敛成 1 处"
的过程中顺带解决的——因为数据来源变成了 Context，`error`/`loading` 只需要在 `Detail`
一处判断（顺手把顺序也倒过来了），子组件不再需要自己处理"数据可能还没来"的分支。
面试时应该讲清楚因果关系：不是"为了修 bug 而重构"，是"重构本身消除了 bug 存在的土壤"。

## 4. 预设追问与思路

- **"为什么不用 Redux（项目里已经有）存这本书的数据，而是用一个页面级 Context？"**
  这本书的数据只在 `Detail` 这一条路由子树里有意义，离开这个页面没人会用到它。放进
  全局 store 意味着要额外考虑"路由切换时要不要清理""要不要每次都重新拉取"这些问题；
  页面级 Context 的生命周期天然和这棵组件树绑定，组件卸载数据就没了，不需要手动清理。

- **"如果 chapter 页也要用这本书的数据，Context 还够用吗？"**
  不够。当前 `pages/chapter` 下的 `progressBar`、`catalog` 两个组件目前还是各自独立
  `useRequest({ url: api.getBook(bookId) })`（复用的还是 `detail/api.ts`），这次
  **没有动它们**——是有意控制这次改动的范围，不是没看到。如果要收敛，思路是一样的：
  在 `chapter` 页顶层建一个 Feature Hook + Context，但那是下一次可以单独拿出来讲的重构，
  不应该混进这次的描述里。

- **"Context 值变化会导致所有消费者重渲染，这里有性能问题吗？"**
  `book` 在页面生命周期内基本不变（除非手动 `mutate` 触发重新验证），而且大多数消费
  组件本来就包了 `React.memo`，重渲染成本可控。如果场景变成数据频繁变化、消费者又多，
  会考虑拆成更细粒度的多个 Context 或者引入支持 selector 的状态方案，但当前规模没有
  这个必要——不要为了不存在的性能问题提前设计。

- **"SWR 本来就会去重，6 次请求其实没有性能代价，那这次重构解决的到底是什么问题？"**
  解决的是可维护性和正确性，不是性能。6 个组件重复写「怎么发请求、怎么判断 loading、
  怎么解包数组」这件事本身就是维护成本；更实际的是它连带产生了两个真实 bug（见第 1 节）
  ——这两个 bug 都不是因为请求发多了，是因为"数据从哪来、什么时候能安全使用"这件事
  没有一个统一、显式的答案。

## 5. 改动文件清单

- `src/hooks/useRequest/useRequest.ts` —— 和 `useInfiniteRequest` 一样补上可选的
  `transform` 参数（bookList 那次的笔记里预告过，这次用上了）
- `src/pages/detail/types.ts` —— 新建，`TBookDetailDTO`（数组）/ `TBookDetailVM`（单个对象）
- `src/pages/detail/api.ts` —— 新增 `transformBookDetail`
- `src/pages/detail/hooks/useBookDetail.ts` —— 新建，Feature Hook 层
- `src/pages/detail/context.tsx` —— 新建，`BookDetailContext` + `useBookDetailContext`
- `src/pages/detail/index.tsx` —— 改用 `useBookDetail` + Context Provider，修正 error/loading 判断顺序
- `src/pages/detail/components/detailHeader/components/detailNavbar/index.tsx`
- `src/pages/detail/components/detailHeader/components/detailBookInfo/index.tsx`
- `src/pages/detail/components/detailHeader/components/detailCatalog/index.tsx`
- `src/pages/detail/components/detailFooter/index.tsx`
- `src/pages/detail/components/detailContent/index.tsx`
  （以上 5 个组件改为 `useBookDetailContext()`，不再各自 `useRequest`）

## 6. 还没做的事（准备面试时不要回避）

- `pages/chapter` 里 `progressBar`、`catalog` 两个组件仍然独立请求同一本书的数据，
  这次没有一起改，是刻意控制范围，不是没发现
- `useBookDetailContext` 的"未在 Provider 内使用会 throw"这条行为没有测试覆盖
- `api.getChapterInfo` 是个不带 `bookId` 的固定地址，mock 数据里 `/chapterInfo` 是
  写死的一份内容，不区分书籍——这是 mock 后端本身的局限，这次没有去动它
- 依旧没有为这次改动补单元测试（比如给 `transformBookDetail` 或
  `useBookDetailContext` 的报错行为写测试）
