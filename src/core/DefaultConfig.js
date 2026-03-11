function DefaultConfig() {
  return {
    ai: [],
    currentAi: "",
    maxIterations: -1, // ai完成工作流的最大迭代次数
    extensions: [],
    isRecordHistory: false, // 是否创建工作流执行记录文件
    isLog: false // 是否创建工作流执行日志
  };
}

module.exports = DefaultConfig;
