// Sentry 初始化。必须是 main.tsx 的第一个 import：
// ES 模块按 import 的顺序执行，放在最前面，后面所有模块在加载时抛出的错误也能被 Sentry 捕获
import { initSentry } from './sentry';

initSentry();
