// 自定义暴露给父组件的方法
  useImperativeHandle(ref, () => ({
    // 只暴露 focus 和 clear 方法
    focus: () => inputRef.current.focus(),
    clear: () => { inputRef.current.value = ''; },
  }));