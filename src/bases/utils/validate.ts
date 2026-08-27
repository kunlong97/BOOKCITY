/**
 * 判断一个值是否为 Promise 对象
 * 通过 duck-typing 方式检测：对象存在且 then 属性为函数
 * @param obj 待检测的值
 * @returns 是否为 Promise
 */
export function isPromise(obj: unknown): obj is Promise<unknown> {
  return !!obj && typeof obj === 'object' && typeof (obj as any).then === 'function';
}
