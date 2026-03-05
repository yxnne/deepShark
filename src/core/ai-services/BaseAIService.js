const { OpenAI } = require('openai')
const { loading, logInfo, logError } = require('../utils')

class BaseAIService {
  constructor(aiCli) {
    this.aiCli = aiCli
    this.config = aiCli.config
    this.name = this.config.currentAi || 'I'
    // Get current AI configuration
    if (Array.isArray(this.config.ai)) {
      const currentName = this.config.currentAi || 'default'
      const currentAiConfig = this.config.ai.find(
        (cfg) => cfg.name === currentName,
      )
      this.aiConfig = currentAiConfig || this.config.ai[0]
    } else {
      // Legacy configuration format
      this.aiConfig = this.config.ai
    }

    this.createClient()
  }

  createClient() {
    this.client = new OpenAI({
      baseURL: this.aiConfig.baseUrl,
      apiKey: this.aiConfig.apiKey || '',
    })
  }

  // 工作流循环
  async agentWorkflow(goal) {
    const extensionManager = this.aiCli.extensionManager
    const { toolDescriptions, toolFunctions } = extensionManager.extensions
    const currentDir = process.cwd();
    const osType = process.platform;
    
    const messages = [
      {
        role: 'system',
        content: `You are an AI assistant that can use tools to accomplish tasks. The current working directory is ${currentDir}, and the operating system is ${osType}. Use the available tools to achieve the user's goal.

IMPORTANT: When you have successfully completed the task, you MUST NOT call any more tools. Simply provide a summary of what was done in your response content and stop.`
      },
      {
        role: 'user',
        content: goal
      }
    ]

    let maxIterations = this.config.maxIterations || 10
    let loadingStop
    try {
      while (maxIterations-- > 0) {
        loadingStop = loading('Thinking...')
        const response = await this.client.chat.completions.create({
          model: this.aiConfig.model,
          messages: messages,
          tools: toolDescriptions,
          tool_choice: 'auto',
          temperature: this.aiConfig.temperature,
          max_tokens: this.aiConfig.maxTokens,
        })

        const message = response.choices[0].message
        messages.push(message)
        loadingStop(`${this.name} have finished thinking.`)
        loadingStop = null
        logInfo(message.content)

        // 检查是否是任务完成的总结响应（没有工具调用且有内容）
        if (!message.tool_calls && message.content) {
          break
        }

        if (message.tool_calls) {
          for (const toolCall of message.tool_calls) {
            const { id, function: func } = toolCall
            const { name, arguments: args } = func
            let toolFunction = toolFunctions[name]
            logInfo(`Calling tool ${toolCall.function.name}`)
            if (toolFunction) {
              try {
                const parsedArgs = JSON.parse(args)
                let result = await toolFunction(...Object.values(parsedArgs))
                if (!result) {
                  result = 'function executed successfully!'
                }
                messages.push({
                  role: 'tool',
                  tool_call_id: id,
                  content: JSON.stringify(result)
                })
              } catch (error) {
                messages.push({
                  role: 'tool',
                  tool_call_id: id,
                  content: JSON.stringify({ error: error.message })
                })
              }
              logInfo(`Tool ${toolCall.function.name} finished.`)
            } else {
              logError(`Tool ${toolCall.function.name} not found.`)
              messages.push({
                role: 'tool',
                tool_call_id: id,
                content: JSON.stringify({ error: `Tool ${name} not found` })
              })
            }
          }
        } else {
          // 没有工具调用，结束
          break
        }
      }
      return messages[messages.length - 1]?.content || ''
    } catch (error) {
      if (loadingStop) {
        loadingStop('AI process terminated unexpectedly: ' + error.message, true)
      } else {
        logError('AI process terminated unexpectedly: ' + error.message)
      }
      throw error
    }
  }

  async _generateResponse(messages) {
    let loadingStop = loading('Thinking...')
    try {
      const response = await this.client.chat.completions.create({
        model: this.aiConfig.model,
        messages: messages,
        temperature: this.aiConfig.temperature,
        max_tokens: this.aiConfig.maxTokens,
        stream: false,
      })
      loadingStop(`${this.name} have finished thinking.`)
      return response.choices[0].message.content
    } catch (error) {
      loadingStop('AI process terminated unexpectedly.' + error.message, true)
      throw error
    }
  }

  derictGenerateResponse(systemDescription, prompt) {
    const messages = []
    messages.push({
      role: 'system',
      content: systemDescription,
    })
    messages.push({
      role: 'user',
      content: prompt,
    })
    return this._generateResponse(messages)
  }
}

module.exports = BaseAIService
