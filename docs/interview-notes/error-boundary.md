# 加全局 Error Boundary —— 面试复盘笔记

第七次没有选具体某个页面。认真查了最后一个候选 category（页面本身、`api.ts`、
`types.ts`、mock 数据），第一次得出"这个页面确实没什么可修"的结论——数据形状
干净、跳转的 key 对得上、`error`/`!data` 判断顺序也是对的、没有多层组件需要
共享数据。跟用户确认后，转向一个前六次反复出现却一直没正面解决的问题：**这个
项目全局没有一个 Error Boundary**。

## 1. 这不是凭空加的功能，是三次真实事故推出来的结论

| 页面 | 崩溃原因 | 后果 |
|---|---|---|
| detail | `DetailFooter` 里 `isShelf(data![0].bookId)` 非空断言，运行时 `data` 是 `undefined` | 整个页面白屏 |
| search | 挂在一个从未真正 mount 到 React 树的孤立 store 上，`state.search` 读 `undefined` | 整个页面白屏，客户端路由跟着失效 |
| ranking | 同上，`state.ranking` 读 `undefined` | 同上 |

三次事故有一个共同点：这个项目**没有任何地方**捕获渲染期间抛出的异常。React
的默认行为是把离出错点最近、一路到根节点为止的整棵组件树全部卸载——不是
"这一个页面挂了"，是连 `<BrowserRouter>` 外层都不剩。之前几次验证的时候都踩
过这个坑：崩溃之后再用 `pushState` 做客户端跳转完全没有反应，因为 React 应用
本身已经死了，必须整页刷新才能恢复。

这次要解决的不是某一个具体 bug，是"**任何**一个还没发现的类似 bug，发生时
不应该让整个应用陪葬"。

## 2. Error Boundary 挂在哪一层，为什么

```tsx
// routers/index.tsx
return (
  <ErrorBoundary>
    <React.Suspense fallback={<Loading />}>{element}</React.Suspense>
  </ErrorBoundary>
);
```

挂在 `<BrowserRouter>` **内部**、`useRoutes()` 结果**外部**。这个位置很关键：
`<BrowserRouter>` 本身完全不在 Boundary 包裹的子树里，不会被牵连——哪怕某个
路由对应的页面组件崩了，Router 监听 URL 变化、响应导航这些事照常工作。如果
把 Boundary 挂得比 `<BrowserRouter>` 还靠外（比如包在 `<Provider>` 外面），
虽然也能兜底，但会把 Redux Provider 也一起置于"崩溃风险区"，一旦哪个 reducer
本身出问题，会把 store 一起干掉，没必要把无关的东西也搭进同一个爆炸半径。

包在 `<Suspense>` 外面，不是里面：`<Suspense>` 处理的是"组件对应的 JS chunk
还没下载完"这种情况，Error Boundary 处理的是"组件下载完了、渲染时抛错"，两者
职责不同，但组件懒加载失败（`import()` reject，比如网络问题导致 chunk 下载
失败）本身也会被 Error Boundary 捕获到——包在外面能多兜住这一种情况。

## 3. 按路由重置：不只是"崩了给个提示"，还要让路由恢复正常

```tsx
const ErrorBoundary: React.FC<IErrorBoundaryProps> = ({ children }) => {
  const location = useLocation();
  return <ErrorBoundaryImpl key={location.pathname}>{children}</ErrorBoundaryImpl>;
};
```

只捕获异常、展示一个错误页，用户会卡死在那个错误页上——除非手动刷新，点导航
栏切换到别的页面也没用，因为 `ErrorBoundaryImpl` 的 `state.error` 一旦被设置，
`render()` 就会一直返回错误 UI，不会因为 `children` 变了就自动清空这个状态
（这是 React class 组件生命周期的正常行为，不是 bug）。

用当前路由的 `pathname` 当 `key`：React 发现 `key` 变了，会把 `ErrorBoundaryImpl`
这个组件实例整个销毁重建（不是更新它的 props），`state.error` 自然被清空成
初始值。用户从崩溃的页面点导航栏切到别的路由，`pathname` 变化触发这次重置，
新页面正常渲染——不需要整页刷新。真人测试过：故意让某个页面崩溃后，用
`pushState` 切到 `/category`，`Category` 正常渲染出全部内容；退回崩溃的路由，
错误页正常再次出现（因为 `key` 变回了那个已知会崩的 pathname）。

## 4. `onBackHome` 为什么用 `window.location.href` 不用 `useNavigate`

```ts
private onBackHome = () => {
  window.location.href = '/';
};
```

`ErrorBoundaryImpl` 是 class 组件，没法直接用 `useNavigate` 这个 hook（可以用
`withRouter` 之类的高阶组件包一层拿到 navigate，但这里没这么做）。更本质的
原因是：**这是"某处已经崩溃"之后的兜底路径，不应该依赖任何可能被牵连的 React
状态还能正常工作**。`useNavigate` 依赖 Router 的 context 没被破坏；虽然这次的
挂载位置保证了 Router 本身不会被崩溃波及，但"兜底逻辑要比它兜的这个底更可靠"
是一条更安全的原则——`window.location.href` 是浏览器原生 API，不依赖任何
React 状态，在任何情况下都能把用户带回一个干净的起点。

## 5. 怎么验证的（这部分方法本身也值得讲）

Error Boundary 这类"专门兜底崩溃"的代码，天生没法用"正常操作走一遍"来验证——
必须真的制造一次崩溃。做法是临时加了一个必崩的测试页面
（`throw new Error(...)`）和一条临时路由，浏览器里跑通"崩溃 → 显示兜底 UI →
控制台里能看到 `componentDidCatch` 记录的错误 → 切换路由后新页面正常渲染 →
点返回首页按钮能正确回到首页"这一整条链路之后，**把测试页面和临时路由都完整
删除**，不留在代码库里。这跟"写完代码就跑一遍 happy path"不是一回事——兜底
代码的正确性只能通过主动触发它想兜住的那种失败来验证，光看代码看不出
`getDerivedStateFromError`/`componentDidCatch` 有没有接对。

## 6. 预设追问与思路

- **"只加一个全局 Boundary，够吗？会不会应该给每个页面都包一层？"**
  取决于想要的兜底粒度。现在这个方案下，一个页面内部任何组件崩溃，代价是
  "整个当前页面被替换成错误提示"，不是"只有出问题的那一小块不显示、其他部分
  正常"。这个项目里大部分页面没有那种"一部分崩了、其他部分还有价值"的结构
  （不像面板类应用，一个 widget 崩了其他 widget 还能用）——多数页面本身就是
  一个业务闭环，局部崩了整体也很难独立使用，所以现在这个粒度是够用的。如果
  以后出现"页面里有独立的、局部崩了不影响其他部分"的板块（比如首页的多个卡片
  类似 detail 那种结构），可以针对那个板块单独再包一层更细粒度的 Boundary。

- **"`componentDidCatch` 里只是 `console.error`，生产环境这样够吗？"**
  不够，这只是本地开发阶段"至少能在控制台看到发生了什么"的最低限度。生产
  环境应该在这里接一个错误上报服务（Sentry 之类），把 `error` 和
  `info.componentStack` 上报出去，不然线上用户遇到的崩溃只有他们自己知道，
  开发者完全没有感知。这次没有接，因为这个项目没有配置任何错误监控基础设施，
  接一个真正的上报服务超出了"补 Error Boundary"这一次改动的范围。

- **"为什么用 `getDerivedStateFromError` 而不是只在 `componentDidCatch` 里
  `setState`？"**
  两者分工不同：`getDerivedStateFromError` 是静态方法，在渲染阶段（render
  phase）被调用，用来算出下一次渲染要用的 state，是 React 官方推荐的"决定
  要不要展示兜底 UI"的地方；`componentDidCatch` 是在 commit 阶段之后调用的
  实例方法，适合做"上报错误"这种副作用，但不适合在这里直接决定渲染结果——
  React 的文档明确建议这两者分开职责，一个管渲染分支、一个管副作用，硬塞进
  一个方法里理论上能跑，但不是推荐用法。

- **"这个 Boundary 能捕获所有类型的错误吗？"**
  不能。Error Boundary 只捕获**渲染期间**（包括生命周期方法和构造函数）抛出
  的异常，捕获不到：事件处理函数里的异常（比如 `onClick` 回调里的 `throw`）、
  异步代码里的异常（`setTimeout`、`Promise` 里的 reject）、SSR 期间的异常、
  以及 Boundary 自己内部抛出的异常。这次修的三次真实事故（`DetailFooter` 的
  非空断言、search/ranking 读 `undefined` 字段）都是同步渲染期间发生的，正好
  落在 Error Boundary 能捕获的范围内，但不代表这个项目以后所有类型的运行时
  错误都会被这一层挡住。

## 7. 改动文件清单

- 新增 `src/components/errorBoundary/{index.tsx, index.module.scss}`
- `src/routers/index.tsx` —— 引入 `ErrorBoundary`，包住 `<Suspense>`

## 8. 还没做的事（准备面试时不要回避）

- 没有接真正的错误上报服务，`componentDidCatch` 目前只打 `console.error`
- 只有一层全局 Boundary，没有针对页面内部"局部崩了不影响其他部分"的场景做
  更细粒度的划分（目前这个项目的页面结构也基本用不上这种划分，见第 6 节）
- 没有为 `ErrorBoundary` 本身写自动化测试——这次的验证是手动制造崩溃、浏览器
  里跑一遍、再把测试代码删掉，不是一个能在 CI 里跑的用例
