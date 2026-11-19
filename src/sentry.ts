import * as Sentry from '@sentry/react';

/**
 * 会话回放（Replay）的代码很大，不打进首屏：
 * 首屏加载完、浏览器空闲时再用动态 import 单独加载，然后加到已经初始化好的 Sentry 上。
 * 代价是首屏加载完成之前发生的错误没有回放录像（错误本身照常上报）。
 */
function loadReplayWhenIdle() {
  const load = () => {
    import('./sentry-replay')
      .then(({ replayIntegration }) => Sentry.addIntegration(replayIntegration()))
      .catch(() => {
        // 回放加载失败不影响页面和错误上报，忽略即可
      });
  };
  const whenIdle = () => {
    if ('requestIdleCallback' in window) window.requestIdleCallback(load);
    else setTimeout(load, 1000);
  };
  if (document.readyState === 'complete') whenIdle();
  else window.addEventListener('load', whenIdle, { once: true });
}

export function initSentry() {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.PROD ? 'production' : 'development',
    // release 不用手动设置：@sentry/vite-plugin 构建时会把版本号（SENTRY_RELEASE）注入到产物里，SDK 会自动读取
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: import.meta.env.PROD ? 0.2 : 0,
    // 回放的采样率在这里配置，回放功能本身由 loadReplayWhenIdle 延迟加载
    replaysSessionSampleRate: import.meta.env.PROD ? 0.1 : 0,
    replaysOnErrorSampleRate: import.meta.env.PROD ? 1.0 : 0,
  });

  // 只有生产环境会录制回放（开发环境的采样率都是 0），开发时不必加载
  if (import.meta.env.PROD) loadReplayWhenIdle();
}
