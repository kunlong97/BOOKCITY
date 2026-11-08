/// <reference types="node" />
import { TextDecoder, TextEncoder } from 'util';

// jest-environment-jsdom 没有提供 TextEncoder / TextDecoder，React Router 7 加载时就会用到。
// 这个文件在 jest.config.js 的 setupFiles 里，早于任何测试代码执行
Object.assign(globalThis, { TextEncoder, TextDecoder });
