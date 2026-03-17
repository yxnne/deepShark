function getDefaultConfig() {
  return {
    ai: [],
    currentAi: "",
    maxIterations: -1, // ai完成工作流的最大迭代次数
    maxMessagesLength: 50000, // 最大压缩长度
    maxMessagesCount: 40, // 最大压缩数量
    extensions: [],
    isRecordHistory: false, // 是否创建工作流执行记录文件,用于因意外终止恢复工作流
    isLog: false // 是否创建工作流执行日志
  };
}

module.exports = getDefaultConfig;
