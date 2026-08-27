import React from 'react';
import cx from 'classnames'; 
import { getTimeItems } from '@/bases/countdown/utils'; 
import useIsomorphicLayoutEffect from '@/hooks/useIsomorphicLayout'; // 同构布局效果hook（兼容SSR）
import './styles/index.scss'; // 组件样式

// 倒计时组件的属性接口定义
export interface CountdownProps {
  /** 倒计时总时长，单位毫秒 */
  time: number;
  /** 倒计时格式，支持 'hh:mm:ss'、'dd:hh:mm:ss' 等格式 */
  format?: string;
  /** 倒计时结束时显示的文案 */
  endText?: string;
  /** 数字部分的自定义样式类名 */
  numberClassName?: string;
  /** 分隔符部分的自定义样式类名 */
  symbolClassName?: string;
  /** 结束文案的自定义样式类名 */
  endTextClassName?: string;
}

// 组件CSS类名前缀
const classPrefix = 'ygm-countdown';

// 时间项类型：包含数字和分隔符的对象数组
// 例如：[{number: '29', symbol: ':'}, {number: '59', symbol: ':'}, {number: '59', symbol: undefined}]
type timeItemType = { num: string; symbol: string | undefined }[];

/**
 * 倒计时组件
 *
 * 核心逻辑：
 * 1. 接收总时长（毫秒）和格式字符串
 * 2. 将总时长拆分为按格式要求的时间片段数组
 * 3. 每秒更新一次UI，直到倒计时结束
 */
const Countdown: React.FC<CountdownProps> = (props) => {
  // 状态管理
  const [timeItems, setTimeItems] = React.useState<timeItemType>([]); // 存储格式化后的时间片段
  const [timeEnd, setTimeEnd] = React.useState<boolean>(false); // 标记倒计时是否已结束

  // 引用管理（避免重复创建）
  const computeTimeRef = React.useRef<number>(props.time); // 当前剩余时间（毫秒），使用ref保证定时器中能获取最新值
  const timerRef = React.useRef<number>(0); // 定时器ID引用
  // 计算倒计时结束的绝对时间戳（组件挂载时确定，后续不变）
  const endTimeMs = React.useMemo(() => Date.now() + props.time, [props.time]);

  /**
   * 更新倒计时UI
   * 根据当前剩余时间计算并设置时间片段
   */
  const setCountdownTimeItems = React.useCallback(() => {
    // 剩余时间 <= 0 表示倒计时已结束
    if (computeTimeRef.current <= 0) {
      setTimeEnd(true);
      clearTimeout(timerRef.current); // 清除可能存在的定时器
      return;
    }

    // 使用工具函数将剩余时间按格式拆分为时间片段数组
    const items = getTimeItems(props.format || 'hh:mm:ss', computeTimeRef.current);
    setTimeItems(items);
  }, [props.format]);

  /**
   * 初始化倒计时逻辑
   * 1. 计算当前剩余时间
   * 2. 设置1秒后再次执行自身（递归定时器）
   * 3. 更新UI显示
   */
  const initCountdown = React.useCallback(() => {
    clearTimeout(timerRef.current); // 清除旧定时器

    const now = Date.now();
    // 计算当前实际剩余时间（考虑页面可能被后台化导致的时间差）
    computeTimeRef.current = Math.max(0, endTimeMs - now);

    // 设置1秒后再次执行（使用setTimeout而非setInterval避免累积误差）
    timerRef.current = window.setTimeout(() => {
      initCountdown();
    }, 1000);

    // 更新UI
    setCountdownTimeItems();
  }, [endTimeMs, setCountdownTimeItems]);

  // 使用同构布局效果（在DOM渲染前执行）
  useIsomorphicLayoutEffect(() => {
    initCountdown(); // 初始化倒计时

    // 清理函数：组件卸载时清除定时器
    return () => {
      clearTimeout(timerRef.current);
    };
  }, [initCountdown]);

  return (
    <div className={classPrefix}>
      {timeEnd && props.endText ? (
        // 倒计时结束时显示结束文案
        <div className={props.endTextClassName}>{props.endText}</div>
      ) : (
        // 渲染时间片段
        timeItems.map((item, index) => (
          <div className={`${classPrefix}-item`} key={index}>
            <div className={cx(`${classPrefix}-item-num`, props.numberClassName)}>{item.num}</div>
            {item.symbol && ( // 只有存在分隔符时才渲染
              <div className={cx(`${classPrefix}-symbol`, props.symbolClassName)}>{item.symbol}</div>
            )}
          </div>
        ))
      )}
    </div>
  );
};

// 设置组件显示名称（便于调试）
Countdown.displayName = 'Countdown';

// 设置默认属性
Countdown.defaultProps = {
  format: 'hh:mm:ss', // 默认显示时:分:秒格式
};

export default Countdown;
