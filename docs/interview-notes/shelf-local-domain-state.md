# shelf 页面重构 —— 面试复盘笔记

第四个页面选的是 shelf（书架页），跟前三次都不一样：前三次全是"服务端数据请求"这条线
（分页转换、组件树内共享、跨页面复用），这次换成**本地持久化的业务状态**——书架数据
存在 `localStorage` 里，不经过网络请求。选它是想证明同一套思路（谁负责读、谁负责写、
写完谁负责通知别人）不是 SWR/Context 专属的，换一个数据源一样适用；也是因为上次
（detail 重构）已经在 `utils/shelf.ts` 里修过一个真实 crash（`isShelf` 在空
localStorage 时 `Object.values(null)` 抛错），这次借机把整个模块重新过一遍，发现
了更多问题。

## 1. 重构前的问题

`utils/shelf.ts` 导出 5 个裸函数（`isShelf`、`setShelf`、`deleteShelf`、
`deleteShelfGroup`、`setGroup`），谁要用就直接 import，各自决定"改完要不要通知别人
刷新"。这带来两个真实 bug：

### bug 1：`setShelf` 忘了发通知

读的一侧（`useReadLocalStorage`）靠监听一个自定义的 `'local-storage'` window 事件
来触发重新渲染；写的一侧要在 `storage.set(...)` 之后手动
`window.dispatchEvent(new CustomEvent('local-storage', {...}))`。`deleteShelf`、
`deleteShelfGroup`、`setGroup` 都记得发，唯独 `setShelf`（也就是详情页"加入书架"按钮
背后调的那个函数）没发。这份契约完全靠写代码的人自己记住，没有任何机制强制。

### bug 2：`isShelf` 和 `setShelf` 对"在不在书架"的定义不一致

`isShelf(id)` 判断"在不在书架"时，散装列表和所有分组都算；但 `setShelf(book)` 只检查
散装列表。后果：如果一本书已经被拖进了某个分组（不在散装列表里），详情页的"加入书架"
按钮初始状态是"已加入"（`isShelf` 返回 true，来自分组），但点一下 `setShelf` 完全不知道
它在分组里，会把它**再插一份**到散装列表——书变成了"分组里有一份、散装列表也有一份"的
重复状态，而按钮本地维护的 `shelfMode` 还会被简单取反成"未加入"，跟数据的真实状态完全
对不上。

这个 bug 在浏览器里实测复现了：把书拖进分组后回到详情页点"加入书架"，重构前会变成
`shelf: [book]` 且 `shelf-group.分组名` 里同时也留着这本书。

### bug 3（顺手发现，跟 localStorage 无关）：`EditBar` 里漏了一次 `dispatch`

```ts
setGroupVisibleMode(false);   // 少了 dispatch()，只是创建了一个 action 对象
```
点选某个分组后，"分组至"弹层不会自动收起——因为这一行根本没有真正派发 action。这是
纯 Redux 层面的疏忽，跟这次重构的主题无关，但正好在改的这个函数里，顺手修了。

## 2. 重构后的结构

新建 `src/features/shelf/hooks/useShelf.ts`，一个 hook 里同时管读和写：

```
useShelf()
├── books / groups        —— 读，基于 useReadLocalStorage，响应式
├── isInShelf(bookId)      —— 查询：散装 + 所有分组，统一的"在不在书架"定义
├── toggle(book)           —— 加入/移出，用的是跟 isInShelf 完全相同的判断
├── removeBooks(books)
├── removeGroups(names)
└── moveToGroup(name, books, groupNames)
```

所有写操作内部都调用同一个 `notify(key)` 函数收尾——不再由调用者各自记得要不要发
事件，写操作本身就不可能漏掉这一步。`utils/shelf.ts` 整个删除，4 个消费方
（`DetailFooter`、`EditBar`、`List`、`GroupList`）全部改成从这一个 hook 取数据和方法。

## 3. 关键设计决策

### 3.1 为什么这次的架构跟前三次"形似"，是巧合还是必然？

跟 `useBookDetail`（服务端数据）长得很像：都是"一个 hook 包住读 + 写 + 同步"。
不是巧合——`useReadLocalStorage` 订阅 `'local-storage'` 事件、重新渲染这件事，
本质上跟 SWR 订阅缓存 key、数据变化后重新渲染是同一个模式（观察者模式的两个实例），
只是"谁是唯一数据源"从"服务端 + SWR 缓存"换成了"localStorage"。**服务端状态和本地
持久化状态需要解决的工程问题是同一类——谁读、谁写、写完怎么通知订阅者——不应该因为
数据源不同就用两套完全不同的思路去解决。**

### 3.2 为什么把 `toggle` 和 `isInShelf` 绑在同一个 hook 里，而不是两个独立函数？

这正是 bug 2 的根源：`isShelf` 和 `setShelf` 是概念上的一对逆操作（"查询当前状态"和
"翻转状态"），但重构前它们是 `utils/shelf.ts` 里两个互相不知道对方存在的独立函数，
各自实现了一遍"什么算在书架里"，实现漂了就对不上。放进同一个 hook、`toggle` 内部
直接调用 `isInShelf` 而不是自己重新写一遍判断逻辑，让这两者不可能出现语义分叉——
这是"单一数据源"原则在读写一致性上的具体应用，不只是"把代码挪个地方"。

### 3.3 为什么 `DetailFooter` 里删掉了本地 `useState`，改成直接派生？

```ts
// 重构前
const [shelfMode, setShelfMode] = useState<boolean>(isShelf(book.bookId));
const onShelf = () => {
  const msg = setShelf(book);
  Toast.show(msg);
  setShelfMode(!shelfMode);   // 手动翻转本地状态
};

// 重构后
const shelfMode = isInShelf(book.bookId);   // 每次渲染都直接从数据源取
const onShelf = () => {
  const msg = toggle(book);
  Toast.show(msg);
};
```

`useShelf` 内部已经是响应式的（`toggle` 触发 `notify` → `useReadLocalStorage` 收到
事件 → 组件重新渲染），本地再维护一份 `shelfMode` state 就是同一份真相的第二个副本。
重构前"手动翻转"这个动作，隐含的假设是"点一下结果一定和当前状态相反"——这个假设在
bug 2 的场景下是错的（点击前 UI 显示"已加入"，但操作实际发生在分组维度，如果只是
简单取反，UI 会显示"未加入"，跟数据说的不是一回事）。删掉这份镜像状态、直接从
`isInShelf` 派生，这类"本地状态和真实数据脱节"的 bug 从设计上就不可能再出现。

## 4. 预设追问与思路

- **"shelfSlice（Redux）和 useShelf（localStorage）看起来都是'书架相关的状态'，
  为什么不放在一起？"**
  两者管的是完全不同性质的东西。`shelfSlice` 里的 `editMode`、`selectedBook`、
  `selectedGroup`、`groupVisibleMode` 是**转瞬即逝的 UI 状态**——离开这个页面、
  刷新浏览器就该清空，天然适合 Redux/组件内 state；`useShelf` 管的是**持久化的
  业务数据**——用户添加到书架的书，刷新浏览器、关掉重开都得还在。生命周期完全不同
  的两种状态，不应该因为"业务上都叫书架"就塞进同一个地方管理。

- **"用 localStorage + 自定义事件做跨组件同步，为什么不干脆也塞进 Redux（毕竟项目里
  已经有 Redux 了）？"**
  可以，但会有代价：Redux 的 store 只在内存里，刷新页面就没了，要保持持久化还得
  额外接 `redux-persist` 之类的中间件，相当于绕一圈重新实现 localStorage 已经天然
  具备的能力。现在这套"localStorage 存数据 + 自定义事件通知订阅者"的机制已经存在
  （`useReadLocalStorage`），这次要解决的问题是"写操作不一致、读写定义不一致"，
  不是"这个机制本身选错了"，没有必要借这次重构换掉整个持久化方案。

- **"`toggle` 内部又调 `isInShelf`、又调 `removeBooks`/`removeFromAllGroups`，
  这几个操作不是原子的，中间被打断会不会有问题？"**
  这是个诚实的局限：`localStorage` 本身没有事务机制，`toggle` 里连续两次
  `storage.set` 调用之间如果发生异常没法回滚。当前场景下两次写入之间是纯同步代码、
  不存在异步让出执行权的机会，所以实际不会被"打断"；但如果未来 `useShelf` 要接入
  真正的异步存储（比如 IndexedDB 或者远程同步），这个"多步写入"就需要重新设计成
  更明确的事务或补偿逻辑，不能照抄现在这版直接搬过去。

- **"为什么 `moveToGroup` 内部还是手写了一遍 `storage.get`/`storage.set`，
  没有复用 `removeBooks` 之类已有的方法做组合？"**
  末尾把移动过的书从散装列表删除时确实复用了 `removeBooks`；但分组内部的合并、去重
  逻辑（`groupsToMerge`、`uniqueBooks` 那段）是 `moveToGroup` 独有的，其他操作
  用不上，硬拆成更小的可复用函数只是把简单逻辑拆得更碎，没有实际复用收益，属于
  不必要的过度抽象。

## 5. 改动文件清单

- 新增 `src/features/shelf/hooks/useShelf.ts`
- 删除 `src/utils/shelf.ts`（内容整体搬进上面这个 hook，并修了 bug 1、bug 2）
- `src/pages/detail/components/detailFooter/index.tsx` —— 改用 `useShelf`，
  删掉本地 `useState` 镜像状态
- `src/pages/shelf/components/list/index.tsx`
- `src/pages/shelf/components/list/components/groupList/index.tsx` —— 顺带修了
  一处类型和默认值不一致（`Record<string, IBookInfo[]>` 类型但默认值是 `[]` 数组）
- `src/pages/shelf/components/editBar/index.tsx` —— 改用 `useShelf`，并补上
  `onGroup` 里漏掉的 `dispatch(setGroupVisibleMode(false))`

## 6. 还没做的事（准备面试时不要回避）

- `useShelf` 没有单元测试，`toggle` 那段"分组场景下会移除而不是重复添加"的行为
  只在浏览器里手动验证过，没有写成自动化用例固定下来
- 书架数据全量存在单个 localStorage key 里，书架书籍数量变大之后每次
  增删都要整体读出、修改、整体写回，没有分页或增量更新的设计——目前书架场景下
  数据量不大，暂时不是问题，但不适合直接套用到数据量级更大的场景
- `moveToGroup` 抛出的"分组名称不能为空"错误目前没有被 `EditBar` 捕获处理，
  如果用户真的提交空分组名，会变成一个未处理的运行时异常而不是友好提示——这是
  重构前就存在的行为，这次没有改
