# chapter 页面重构 —— 面试复盘笔记

第三个页面选的是 chapter（阅读页），跟前两次不太一样：这次没有引入新的分层概念，
而是**兑现了上次 detail 重构笔记里立的一个 flag**——当时发现 `pages/chapter` 下的
`progressBar`、`catalog` 两个组件复用 `detail/api.ts` 独立请求同一本书的数据，跟
detail 重构前的问题一模一样，但当时刻意没动它。这次的问题是：detail 页面已经有一套
"Feature Hook + Context"方案了，chapter 页面复用的还是同一个接口、同一个数据形状，
是把这套方案在 chapter 里再实现一遍，还是把它提升成两个页面共享的模块？

## 1. 决定：提升为跨页面的 feature 模块

把原来挂在 `pages/detail/` 下的这几个文件搬到了 `src/features/bookDetail/`：

```
src/features/bookDetail/
├── types.ts    （原 pages/detail/types.ts）
├── api.ts      （原 pages/detail/api.ts 里的 getBook + transformBookDetail）
├── hooks/useBookDetail.ts
└── context.tsx （BookDetailContext + useBookDetailContext）
```

`pages/detail/api.ts` 现在只剩下 `getChapterInfo`——那是 detail 页面自己的资源
（章节正文），不是"书籍详情"这个概念的一部分，没有理由跟着搬。

### 为什么不等到"第三次出现"再抽（关于 Rule of Three）

"重复三次才抽象"是一个常见的经验法则，用来防止过早、猜测性的抽象——你还没见过
第二、第三个使用场景时，抽出来的接口形状大概率是错的。但这条法则的前提是"这是一个
新总结出来的抽象"，而这里根本不是：`api.getBook(id)` 这个接口、`IBookInfo[]` 这个
返回形状、"过滤查询返回数组要解包成单个对象"这个转换逻辑，在 detail 和 chapter 两个
页面里是**完全相同的概念**，不是"看起来相似、可能未来会分叉"的东西。继续让 chapter
复用 `pages/detail/api.ts` 里的函数，本质上是把一个跨页面的概念，错误地锁在了某一个
页面的私有目录里——这次只是把文件挪到了它实际所属的位置，不是在做一次真正意义上的
"抽象出一个新接口"。

## 2. 不能照搬 detail 的 Provider 用法

> **术语澄清（容易被追问穿的地方）**：下面说的"阻塞/不阻塞"，指的是组件函数体里
> 用一个普通的 `if (!data) return <Loading/>` 提前 return，把子树的挂载拖到数据
> 到达之后——这是纯 JS 层面的条件渲染，跟 React 的 `<Suspense>` 完全是两回事。
> 真正的 Suspense 挂起是子组件在渲染过程中 `throw` 一个 Promise，由 React 自己
> 捕获并暂停子树的 commit，这需要数据源配合（比如 SWR 打开 `suspense: true`），
> 而这个项目的 `useRequest`/`useInfiniteRequest` 全程走的是 SWR 经典的
> `data`/`error` 返回值模式，没有开这个选项，压根不存在 throw promise 这回事。
> 这个项目里唯一真正的 `<Suspense>` 用在 [routers/index.tsx](../../src/routers/index.tsx)，
> 包的是 `React.lazy` 路由级代码分割，等待的是 JS chunk 下载，不是接口数据，
> 跟这里讨论的完全是另一件事。

detail 页面的做法是：`Detail` 组件函数体里先用 `if (loading || !data) return <Loading/>`
提前 return，Provider 连同子树只有在这行代码不成立之后才会被执行到，子树里
读到的 `book` 保证非空（`useBookDetailContext` 读到 null 直接 throw）。

chapter 页面如果照搬这个用法，需要在 `Chapter`（或 `ChapterFooter`）拿到 `/book`
数据之前先返回 `<Loading />`——但阅读正文（`ChapterContent`）用的是完全不同的接口
（`/chapterInfoDetail`），跟这本书的 `/book` 数据毫无关系。如果为了目录弹层和进度条
弹层要用到的数据，让整个阅读页等一个跟阅读内容无关的请求，这是一个不该引入的倒退——
阅读页应该尽快能看到正文，弹层里的数据晚一点点填充是完全可以接受的（弹层本来就是
默认收起的）。

所以这次的 Provider（挂在 `ChapterFooter` 上）**不等待数据**，直接把
`useBookDetail` 返回的 `data`（可能还是 `undefined`）传下去，`Catalog` 和
`ProgressBar` 用不会抛错的 `useContext(BookDetailContext)` 直接读，自己处理
"还没加载完"（`null`）这个中间状态——用可选链、`{book && (...)}` 这种和它们重构前
一模一样的写法。

`features/bookDetail/context.tsx` 里因此保留了两种消费方式，各自对应一种场景：

| | detail 页面 | chapter 页面 |
|---|---|---|
| Provider 什么时候挂载子树 | 数据 ready 之后才挂载 | 立刻挂载，不等数据 |
| 子树里 `book` 可能是 null 吗 | 不可能（是编程错误） | 可能（是合法的加载中状态） |
| 用哪种 hook | `useBookDetailContext()`，读到 null 直接 throw | 原始 `useContext(BookDetailContext)`，自己判空 |

这是同一个 Context 根据"要不要用 `if` 提前 return 把子树挂载 gate 住"这一个维度
分化出的两种正确用法，不是风格不统一，也不涉及 Suspense。

## 3. 效果

- `ChapterFooterCatalog`、`ChapterFooterProgressBar` 不再各自 `useRequest`，改为
  `useContext(BookDetailContext)`；`ChapterFooter` 是唯一发起 `/book?bookId=xxx`
  请求的地方
- 浏览器实测：阅读页加载时只发一次 `/book?bookId=xxx`（之前 SWR 按 key 去重虽然
  也只发一次网络请求，但这次是代码层面就只有一处调用点，不是靠去重掩盖重复实现）
  ，同时 `/chapterInfoDetail?bookId=xxx`（正文数据）并行请求、不等待前者，正文
  立刻渲染出来
- detail 页面在文件搬家之后回归测试正常，5 个消费组件的 import 路径改成
  `@/features/bookDetail/context`，行为没有变化

## 4. 预设追问与思路

- **"为什么不干脆也把 useRequest/useInfiniteRequest 这类通用 hook 挪到 features 里？"**
  它们跟"书籍详情"这个业务概念无关，是纯粹的技术通用能力（发请求、缓存、去重），
  本来就该待在 `hooks/` 这种技术分层目录里。`features/bookDetail` 放的是"书籍详情
  这个业务概念相关的一整套东西"（数据形状、转换逻辑、请求编排、分发方式），是按
  业务概念分层，跟按技术能力分层是两个维度，不应该混在一起。

- **"两个页面用同一个 Context 实例，会不会有状态串扰？比如从 detail 跳到 chapter，
  上一个页面的 book 数据会不会残留？"**
  不会。Context 的值是通过 Provider 的 `value` prop 传下去的，`Detail` 和
  `ChapterFooter` 各自有自己的 Provider，谁在渲染就用谁的 `value`，页面卸载后
  Provider 也跟着卸载，不存在"上一个页面的值残留到下一个页面"这回事。这里唯一共享
  的是 Context **的定义**（一份 `createContext` 调用产生的引用）和请求caching（SWR
  的缓存按 URL key 共享），不是共享某一次渲染出来的具体值。

- **"如果以后又有第三个页面要读这本书的数据，会不会想再抽象一层？"**
  不需要，`features/bookDetail` 现在已经是这个抽象了，第三个使用方直接
  `import useBookDetail from '@/features/bookDetail/hooks/useBookDetail'` 即可，
  不需要再动。真正需要重新设计的信号是：如果某个新场景需要的不是"这本书的完整
  详情"，而是这份数据的某个变体（比如只要标题不要目录），那时候才需要考虑要不要
  在 `features/bookDetail` 里加一个更细粒度的选择器，而不是照抄现在这个 hook。

- **"这次为什么没有再往前一步，把 detail 页面本身也改成不用 `if` gate 住渲染？"**
  detail 页面的场景和 chapter 不一样：detail 整个页面的内容（标题、简介、目录、
  开始阅读按钮）全部依赖这本书的数据，没有"不依赖它的正文"可以先渲染，用 `if`
  提前 return 在这里是合理的，不是需要修的问题。"要不要 gate 住"取决于子树里有没有
  不依赖这份数据的内容，不是一个页面级别可以一刀切的规则，更不是"能用 Suspense
  才叫先进"——这里从头到尾都没用 Suspense。

## 5. 改动文件清单

- 新增 `src/features/bookDetail/{types.ts, api.ts, hooks/useBookDetail.ts, context.tsx}`
- 删除 `src/pages/detail/{types.ts, context.tsx, hooks/useBookDetail.ts}`（内容搬到上面）
- `src/pages/detail/api.ts` —— 只保留 `getChapterInfo`
- `src/pages/detail/index.tsx` 及其 5 个消费组件 —— import 路径改为 `@/features/bookDetail/...`
- `src/pages/chapter/componets/footer/index.tsx` —— 新增 `useBookDetail` 调用 + `BookDetailContext.Provider`（不阻塞）
- `src/pages/chapter/componets/footer/components/catalog/index.tsx`
- `src/pages/chapter/componets/footer/components/progressBar/index.tsx`
  （以上两个组件改为 `useContext(BookDetailContext)`，不再各自 `useRequest`）

## 6. 还没做的事（准备面试时不要回避）

- `ChapterContent` 里通过 `/chapterInfoDetail` 拿到的章节数（`chapterContent.length`）
  和 `features/bookDetail` 里 `book.chapters.length` 其实是两份独立来源、理论上应该
  相等的"这本书一共多少章"。这次没有把它们统一成一个数据源——统一需要动 mock 数据
  或后端接口的设计，超出这次前端分层重构的范围，只是记录下来
- `features/bookDetail` 这套东西同样没有单元测试
- `ChapterFooterCatalog` 的 `onClickChapter` 仍然依赖 `useParams()` 拿 `bookId`，
  没有改成从 Context 里的 `book.bookId` 读——这是有意保留的：跳转逻辑属于路由层面的
  关注点，不应该依赖"书籍数据是否加载完成"，两者语义上不是一回事，混在一起会让
  以后这行代码为什么这么写变得难以理解
