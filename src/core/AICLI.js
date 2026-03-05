const OllamaService = require("./ai-services/OllamaService");
const DeepSeekService = require("./ai-services/DeepSeekService");
const OpenaiService = require("./ai-services/OpenaiService");
const ExtensionManager = require("./extends/ExtensionManager");
const readline = require("readline");
const { logError } = require("./utils");

class AICLI {
  constructor(config) {
    this.config = config;
    this.aiService = null;
    this.extensionManager = null;
    this.initialize();
  }
  // 解析配置文件
  initialize() {
    // Get current AI configuration
    let currentAiConfig;
    if (Array.isArray(this.config.ai)) {
      const currentName = this.config.currentAi || "default";
      currentAiConfig = this.config.ai.find(config => config.name === currentName);
      if (!currentAiConfig) {
        // If current configuration not found, use the first one
        currentAiConfig = this.config.ai[0];
      }
    } else {
      // Legacy configuration format
      currentAiConfig = this.config.ai;
    }
    
    const service = currentAiConfig?.type || "ollama";
    if (service === "deepseek") {
      this.aiService = new DeepSeekService(this);
    } else if (service === "openai") {
      this.aiService = new OpenaiService(this);
    } else {
      this.aiService = new OllamaService(this);
    }
    // 初始化扩展
    this.extensionManager = new ExtensionManager(this);
  }
  // 单轮对话
  async run(userPrompt) {
    try {
      await this.aiService.agentWorkflow(userPrompt)
    } catch (error) {
      logError(error.stack);
      throw error;
    }
  }
  // 多轮对话
  startInteractive() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: "> ",
    });

    console.log("AI CLI Assistant");
    console.log('Type your question or command. Type "exit" to quit.');
    console.log("=".repeat(50));
    rl.prompt();

    rl.on("line", async (line) => {
      const input = line.trim();

      if (input.toLowerCase() === "exit") {
        rl.close();
        return;
      }

      try {
        await this.run(input);
      } catch (error) {
        console.error("Error:", error.message);
      }

      console.log("=".repeat(50));
      rl.prompt();
    });

    rl.on("close", () => {
      console.log("Goodbye!");
      process.exit(0);
    });
  }

  _parseResponse(response) {
    if (!response) {
      throw new Error('AI returned empty data')
    }
    response = response.trim().replace(/^```json\n|```$/g, "");
    try {
      const steps = JSON.parse(response);
      if (Array.isArray(steps)) {
        return steps
      } else {
        return [{ type: 1, content: response, description: "" }];
      }
    } catch (error) {
      logError("返回数据解析错误," + error.stack);
      return [{ type: 1, content: response, description: "" }];
    }
  }
}

module.exports = AICLI;
