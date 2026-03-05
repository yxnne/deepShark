function DefaultConfig() {
  return {
    ai: [
      {
        name: "default",
        type: "deepseek",
        baseUrl: "https://api.deepseek.com",
        model: "deepseek-reasoner",
        apiKey: "",
        temperature: 1,
        maxTokens: 8192,
        stream: true,
      }
    ],
    currentAi: "default",
    outputAiResult: false,
    maxIterations: 10, // ai完成工作流的最大迭代次数
    plugins: [],
    extensions: [],
    file: {
      encoding: "utf8",
    },
  };
}

module.exports = DefaultConfig();
