# home 页面重构 —— 面试复盘笔记

第六个页面选的是 home（首页）。表面上看是 detail 重构那次同一类问题的第三次
出现：`Popular`、`Recommend`、`LimitedReader`、`Ranking` 四个组件，跟 `Home`
自己一起，各自独立 `useRequest<IHomeData>({ url: api.getHomeData })` 请求同一
个接口——SWR 按 key 去重不会真的发 5 次网络请求，但请求逻辑被复制了 5 遍，
这一点和 detail 重构前一模一样。

但这次**没有用 Context**，这是这份笔记真正想讲的地方：同样是"多处重复请求
同一份数据"，detail 和 home 的组件树形状不一样，导致正确的解法也不一样。

## 1. 为什么这次不该用 Context

detail 页面的组件树是：

```
Detail
└─ DetailHeader          ← 自己不需要数据，只是个"壳"
   ├─ DetailNavbar        ← 需要数据
   ├─ DetailBookInfo       ← 需要数据
   └─ Catalog               ← 需要数据
```

`DetailHeader` 挡在 `Detail` 和三个真正需要数据的组件中间，如果用 props，
`DetailHeader` 也得被迫接一个自己用不上的 `book` prop 再转发下去——这是
教科书式的 prop drilling，Context 正是为这种场景设计的。

home 页面的组件树是：

```
Home
├─ Header          ← 不需要数据
├─ Navbar            ← 不需要数据
├─ Popular            ← 需要数据（只需要 popular 字段）
├─ Recommend          ← 需要数据（只需要 recommend 字段）
├─ LimitedReader      ← 需要数据（只需要 limited 字段）
└─ Ranking            ← 需要数据（只需要 ranking 字段）
```

`Popular`、`Recommend`、`LimitedReader`、`Ranking` 全部是 `Home` 的**直接子
组件**，中间没有任何不关心数据、只负责组合的穿透层。这种情况下用 props 传递
不存在"路过不关心的中间组件"这个问题——`Home` 请求一次，直接把各自要用的那
一小片数据当 props 传下去就够了。

**Context 该解决的是"数据要穿过不关心它的中间组件"这个问题；这里根本不存在
这个问题，硬套 Context 只是多引入一层不必要的间接**——多一次 `useContext`
调用、多一处"这个值到底是从哪儿来的"要去追踪，而这层追踪成本在这里换不来
任何好处。

## 2. Props 比 Context 多做对的一件事：精确到字段

```tsx
<Popular books={data.popular} />
<Recommend books={data.recommend} />
<LimitedReader books={data.limited} />
<Ranking rankings={data.ranking} />
```

如果用 Context，通常会把整个 `IHomeData` 塞进 Provider，各个消费者自己
`useContext` 出来再挑自己要的字段（`data.popular`、`data.recommend`……）——
这是 detail 页面 `BookDetailContext` 的做法，因为那边所有消费者要的都是
"同一个 book 对象"的不同属性，数据本身就是一个不可再分的整体。

home 不一样：`IHomeData` 是五个互不相关的板块拼在一起的一个响应体，`Popular`
只关心 `popular`，`Ranking` 只关心 `ranking`。用 props 可以把这种"我只要
这一小片"的关系显式写在每个组件的 props 类型上：

```tsx
interface IPopularProps {
  books: IBookInfo[];
}
```

看这一个类型定义就知道 `Popular` 依赖什么、不依赖什么。如果换成 Context，
这个信息会被"藏"在组件内部的 `useContext(HomeDataContext)` 调用里，外部
看不出这个组件到底用了整个数据对象里的哪一部分——props 类型签名本身就是
最直接的文档，Context 没有这个副作用。

## 3. 顺手做的两件小事

- `Home/index.tsx` 里原来的错误分支有一行调试用的 `console.log('错误')`，
  这次顺手删掉了——生产代码里不应该留着这种排查时加的日志
- `Popular`、`LimitedReader` 之前没有包 `React.memo`（`Recommend`、`Ranking`
  已经包了），这次统一补上。理由：现在四个组件的数据都来自同一个父组件的
  props，`Home` 只要重新渲染（哪怕是因为 `Header`/`Navbar` 未来加了跟数据
  无关的本地状态），没有 `memo` 的子组件也会跟着重新渲染；包一层 `memo`，
  只有传入的 `books`/`rankings` 真的变了才会重新渲染，这在"数据从父组件props
  下发"这种结构下是有意义的防护，重构前每个组件各自订阅 SWR、渲染时机各自
  独立，没有这个必要性

## 4. 预设追问与思路

- **"这次为什么没有像 chapter 那次一样，把 useHomeData 提升成跨页面共享的
  feature 模块？"**
  `features/bookDetail` 是因为 detail 和 chapter 两个不同的页面都真的需要
  "同一本书的详情"这个概念，是两个独立使用方在复用同一份逻辑。home 数据
  （banner、popular、recommend、ranking、limited）目前只有 home 这一个页面
  用，没有第二个消费方——提升成 `features/` 没有任何实际收益，只是给一个
  只有一个用户的模块换了个更"正式"的位置，纯属过度设计。判断要不要提升到
  `features/` 的标准是"有没有真实的第二个使用方"，不是"这个数据看起来是不是
  很重要"。

- **"如果以后 Header 或者 Navbar 也需要用到首页数据的某个字段，还继续用 props
  吗？"**
  取决于新增的消费者是不是也是 `Home` 的直接子组件。如果是，继续加一个 props
  就行；如果这个需求恰好出现在某个"壳"组件的更深层（比如以后 `Popular` 底下
  又拆出子组件，子组件也要访问 home 数据的某个字段，中间隔着 `Popular` 自己
  不需要的数据），那时候"是否存在穿透"这个条件变了，才是重新评估要不要引入
  Context 的时机——不是"以后可能会用到"就提前加，是"现在已经出现穿透"才加。

- **"Popular 和 LimitedReader 补上 React.memo 之后，`onHeaderClick` 这种内联
  箭头函数会不会导致 memo 不起作用？"**
  会有影响，但影响有限：`onHeaderClick`、`renderContent` 这些内联函数确实
  每次渲染都是新的引用，如果它们被当作 props 传给更深层、也包了 `memo` 的
  子组件，会让那些子组件的 `memo` 失效。但这里它们只在组件自己内部使用（绑给
  `Card` 的 `onHeaderClick`、直接调用渲染 JSX），不是传给外部的子组件 props，
  所以不影响这次加的 `memo` 本身的效果——`memo` 比较的是 `Popular` 自己收到
  的 `books` 这个 prop 有没有变，跟组件内部怎么定义局部函数无关。

## 5. 改动文件清单

- 新增 `src/pages/home/hooks/useHomeData.ts`
- `src/pages/home/index.tsx` —— 改用 `useHomeData`，把数据切片当 props 传给
  四个子组件，删掉调试用的 `console.log`
- `src/pages/home/components/{popular, recommend, limitedReade, ranking}/index.tsx`
  —— 都不再自己 `useRequest`，改成接收 props；`popular`、`limitedReade`
  补上 `React.memo`

## 6. 还没做的事（准备面试时不要回避）

- 没有为 `useHomeData` 写单元测试
- `Popular`/`Recommend`/`LimitedReader` 三个组件里 `renderContent` 这类渲染
  函数每次渲染都会重新创建，这次没有顺手用 `useMemo` 包一层——数据量小、
  渲染开销低，包一层 `useMemo` 收益不明显，属于当前规模下没必要做的优化
