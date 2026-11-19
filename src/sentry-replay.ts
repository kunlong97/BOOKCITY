// 单独成一个模块，只被 src/sentry.ts 动态 import：构建时会拆成独立的 chunk，不进入首屏的入口 JS
export { replayIntegration } from '@sentry/react';
