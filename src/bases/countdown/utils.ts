// 时间常量（毫秒）
const DAY_MILLISECONDS = 24 * 60 * 60 * 1000; // 一天的毫秒数
const HOURS_MILLISECONDS = 60 * 60 * 1000; // 一小时的毫秒数
const MINUTES_MILLISECONDS = 60 * 1000; // 一分钟的毫秒数

/**
 * 格式化单个时间单位（补零）
 * @param val 数值
 * @returns 格式化后的两位字符串（如 5 -> '05'）
 */
const formatTime = (val: number): string => {
  if (val <= 0) return '00';
  return val < 10 ? `0${val}` : `${val}`; // 修正：使用反引号`而非单引号'
};

/**
 * 将剩余时间解析为各时间单位
 * @param format 格式字符串（如 'hh:mm:ss'）
 * @param timeLeft 剩余时间（毫秒）
 * @returns 包含各时间单位的对象
 */
const getTime = (format: string, timeLeft: number) => {
  let d = Math.floor(timeLeft / DAY_MILLISECONDS); // 天数
  let h = Math.floor((timeLeft % DAY_MILLISECONDS) / HOURS_MILLISECONDS); // 小时
  let m = Math.floor((timeLeft % HOURS_MILLISECONDS) / MINUTES_MILLISECONDS); // 分钟
  let s = Math.floor((timeLeft % MINUTES_MILLISECONDS) / 1000); // 秒

  // 处理格式中缺少某些单位的情况（将高位单位合并到低位）
  if (timeLeft > DAY_MILLISECONDS && format.indexOf('d') === -1) {
    h += d * 24; // 如果格式中没有'd'，则将天数转为小时
    d = 0;
  }
  if (timeLeft > HOURS_MILLISECONDS && format.indexOf('h') === -1) {
    m += h * 60; // 如果格式中没有'h'，则将小时转为分钟
    h = 0;
  }
  if (timeLeft > MINUTES_MILLISECONDS && format.indexOf('m') === -1) {
    s += m * 60; // 如果格式中没有'm'，则将分钟转为秒
    m = 0;
  }

  return {
    dd: formatTime(d),
    hh: formatTime(h),
    mm: formatTime(m),
    ss: formatTime(s),
    d,
    h,
    m,
    s, // 原始数值（非格式化）
  };
};

type formatType = 'dd' | 'hh' | 'mm' | 'ss';

/**
 * 将格式字符串拆分为时间片段数组
 * @param format 格式字符串（如 'hh:mm:ss'）
 * @param timeLeft 剩余时间（毫秒）
 * @returns 格式化后的时间片段数组
 *
 * 示例输入：format='hh:mm:ss', timeLeft=3601000 (1小时1秒)
 * 示例输出：[
 *   {num: '01', symbol: ':'},
 *   {num: '00', symbol: ':'},
 *   {num: '01', symbol: undefined}
 * ]
 */
export const getTimeItems = (format: string, timeLeft: number) => {
  // 提取格式中的时间单位标识（如 ['hh', 'mm', 'ss']）
  const timeArr: string[] = format.match(/[a-zA-Z]{1,2}/g) || [];

  // 提取格式中的分隔符（如 [':', ':']）
  const symbolArr = format.match(/[^a-zA-Z]+/g) || [];

  // 获取各时间单位的格式化值
  const time = getTime(format, timeLeft);

  // 组合时间片段
  return timeArr.map((item, i) => ({
    num: time[item.toLowerCase() as formatType], // 获取对应时间单位的格式化值
    symbol: symbolArr[i], // 对应位置的分隔符（最后一个单位后无分隔符）
  }));
};
