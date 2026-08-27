# bookList 页面分层重构 —— 面试复盘笔记

## 1. 重构前的问题

`pages/bookList/index.tsx` 原来是这样的：页面组件里直接调用 `useInfiniteRequest`，
自己算 `hasMore`，自己写 `loadMore` 的防重入判断，拿到的数据不做任何加工直接渲染。

这带来两个实际问题（不是为了重构而编的）：

1. **数据和展示逻辑耦合在页面组件里**，页面组件既要管"怎么取数"又要管"怎么渲染"，
   多个页面各写一遍类似的 `hasMore`/`loadMore` 逻辑无法复用。
2. **一个真实的展示 bug**：`api-now/db.json` 里 `bookList_001` 的 7 条数据中有 5 条没有
   `categoryName` 字段，但全局类型 `IBookInfo.categoryName` 却标成了必填 `string`。
   页面直接渲染 `${book.author}·${book.categoryName}`，这些数据会显示成
   `Fyodor Dostoevsky·undefined`。类型"说谎"了，因为没人在数据边界上做校验/兜底。

## 2. 重构后的分层

```
Page (index.tsx)
  只消费 { data, loading, error, hasMore, loadMore }，不知道数据怎么来的
      │
      ▼
Feature Hook (hooks/useBookList.ts)
  编排：调哪个 API、分页状态怎么管、什么时候算到底、loading/error 怎么归一化
      │
      ▼
SWR/Cache 层 (hooks/useRequest/useInfiniteRequest.ts)
  只管分页 key 生成、发请求、去重缓存 —— 通用机制，不认识任何业务字段
  新增第三个可选参数 transform，把"数据怎么加工"这件事让渡给调用方
      │
      ▼
API 层 (pages/bookList/api.ts)
  拼 URL + transformBookListPage()：把 DTO（接口原始形状）转成 VM（视图模型）
  这里是唯一知道"categoryName 可能缺失，缺失时兜底成 'Uncategorized'"的地方
      │
      ▼
HTTP Client (hooks/useRequest/axiosInstance.ts)
  统一错误契约：无论超时、断网、4xx/5xx，最终都 reject 一个 { code, msg } 形状
      │
      ▼
   json-server (mock 后端)
```

## 3. 每一层为什么这么定边界（这是面试里最该讲透的部分）

### 3.1 为什么 transform 不写在 SWR 层内部，而是当参数传进去？

`useInfiniteRequest` 是全项目共享的通用 hook，`ranking`、`category`、`search` 等页面
都在用。如果直接在这个 hook 里写"给 categoryName 兜底"这种业务逻辑，这个 hook 就不再
通用了。做法是给它加一个可选的第三参数 `transform?: (data: Data) => VM`，不传时行为和
之前完全一致（`VM` 退化成 `Data`），传了就等于把"数据加工"这个职责借给调用方（API 层）
临时执行一次，hook 本身依然不需要认识任何业务字段。

> 这是"依赖倒置"的一个具体应用：通用层不依赖具体业务，具体业务通过参数注入到通用层的
> 执行流程里。

### 3.2 为什么错误处理要在 HTTP Client 层统一，而不是各层各自处理？

重构前 axios 拦截器捕获错误后只是 `console.error` 然后原样 `reject` 一个 `AxiosError`。
如果每一层（SWR 层、Feature Hook 层、Page 层）都要处理错误，就都得知道 `AxiosError` 的
内部结构（`error.response.status`、`error.request` 是否存在……），错误处理逻辑会散落在
各处，而且一旦以后把 axios 换成别的请求库，所有消费方都要跟着改。

现在的做法：HTTP Client 层的响应拦截器把三种错误来源（服务端非 2xx / 请求发出但无响应 /
请求都没发出去）统一 normalize 成 `{ code, msg }`，往上所有层只需要认识这一种形状。
`msg` 字段的命名特意和成功响应 `{ code, msg, data }` 保持一致，这样"成功"和"失败"两条
路径用的是同一套语义，不需要消费方分别记两套字段名。

### 3.3 为什么只给 `useInfiniteRequest` 加了 transform，没有动 `useRequest`？

`useRequest`（非分页版本）目前被十几个页面在用，但这次的需求范围只是 bookList 这一个
分页页面。给 `useRequest` 加同样的能力技术上没有难度，但当前没有真实使用场景，属于
"预判未来需求"式的过度设计。等确实有第二个页面需要在 API 层做转换时再加，改动量是
可预期的一行泛型 + 一个可选参数，不会推翻现有设计。

> 面试时如果被问"其他页面呢"，诚实的答案应该是"目前只有 bookList 落地了这套分层，
> 这是有意先做一个页面把模式跑通、验证设计是否合理，再决定要不要推广"，而不是暗示
> 整个项目都已经是这个架构。

### 3.4 DTO 和 VM 为什么要拆成两个类型？

`types.ts` 里新增了 `IBookItemDTO`（`categoryName` 显式可选，如实反映接口真实返回的
数据形状）和 `IBookListVM`（经过 transform 后 `categoryName` 保证有值）。拆开的意义是
让类型系统在编译期就能提醒你：还没转换过的数据不能被当成"已经安全"的数据来用。
如果两者共用一个类型（就像重构前直接用全局 `IBookInfo`），TypeScript 没法帮你发现
"这批数据其实还没兜底"这种问题，`undefined` 就是这样漏到页面上的。

## 4. 可能的追问与思路（自测用）

- **"为什么不在 axios 拦截器里直接做 categoryName 兜底，这样不是更省事吗？"**
  拦截器是 HTTP Client 层，管的是"请求/响应的通用处理"（超时、状态码、基础结构校验），
  不应该认识 `categoryName` 这种具体业务字段。如果以后要新增一个不需要这个字段的
  接口，拦截器里的业务逻辑就变成了隐藏的耦合点，谁都不知道它在哪、什么时候会误伤别的接口。

- **"分页请求失败了（不是首屏，是往后翻的某一页），UI 上是什么表现？"**
  当前实现：`useInfiniteRequest` 的 `error` 是整体性的，某一页失败会让 `error` 变成
  非空，从而在 Page 层直接整体展示 `ErrorBlock`，把已经加载出来的前几页也一起替换掉了。
  这是当前设计的一个真实局限，更好的做法是区分"首屏失败"和"翻页失败"两种状态，翻页
  失败时只在列表底部给一个"加载失败，点击重试"，不影响已渲染内容 —— 这是诚实承认的
  待改进点，不是已经做好的。

- **"mock 数据里，你怎么验证第二页确实请求了、`loadMore` 逻辑是对的？"**
  `json-server` 是静态文件驱动的假后端，不识别 `?pageIndex=` 查询参数，无论请求第几页，
  返回的都是 `bookList_001` 这同一份数据，且 `isLast` 恒为 `false`。这意味着当前环境下
  `loadMore` 会不断重复加载同一批数据、永远不会触底 —— 这是 mock 后端的局限，不是分页
  逻辑本身的 bug。分页逻辑的正确性（`hasMore` 依据最后一页 `isLast` 计算、`isValidating`
  防止重复触发）是可以脱离数据内容单独验证的。

- **"这套分层对性能有什么帮助吗？"**
  诚实回答：这次改动的目标是职责分离和可维护性，不是性能优化。真正影响性能的是
  `useInfiniteRequest` 底层的 SWR 缓存去重、`InfiniteScroll` 基于 `IntersectionObserver`
  的触底加载、以及 `Image` 组件的懒加载，这些在重构前就已经存在，这次没有改动。
  不要把"代码更整洁"包装成"性能更好"。

## 5. 改动文件清单

- `src/hooks/useRequest/axiosInstance.ts` —— 新增 `INormalizedError`、`normalizeError`
- `src/hooks/useRequest/useRequest.ts` —— error 类型从 `AxiosError<Error>` 改为 `INormalizedError`（纯类型修正，行为不变）
- `src/hooks/useRequest/useInfiniteRequest.ts` —— 同上 + 新增可选 `transform` 参数
- `src/pages/bookList/types.ts` —— 拆出 `IBookItemDTO` / `IBookListDTO` / `IBookListVM`
- `src/pages/bookList/api.ts` —— 新增 `transformBookListPage`
- `src/pages/bookList/hooks/useBookList.ts` —— 新建，Feature Hook 层
- `src/pages/bookList/index.tsx` —— 改为消费 `useBookList`

## 6. 还没做的事（准备面试时不要回避）

- 没有补单元测试（比如给 `transformBookListPage` 写测试验证 `categoryName` 兜底逻辑）
- 只落地了 bookList 一个页面，其余 7 个页面仍是重构前的直接调用方式
- 分页失败的降级体验（见第 4 节）还没做
- 没有做过真实的性能对比测试，无法在 README 里放压测数据
