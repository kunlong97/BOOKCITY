export type {ToastShowProps} from '@/bases/toast/method';
import {show} from '@/bases/toast/method';

// 定义 Toast 对象的类型：为 show 属性提供精确的类型提示
export interface ToastProps{
   show: typeof show;
}

// 创建命令式 API 对象：将 show 函数挂载到 Toast 对象上
const Toast = {
   show,
}
export default Toast;