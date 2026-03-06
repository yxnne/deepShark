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
    this.maxMessagesLength = this.config.maxMessagesLength || 50000
    this.maxMessagesCount = this.config.maxMessagesCount || 20
  }

  createClient() {
    this.client = new OpenAI({
      baseURL: this.aiConfig.baseUrl,
      apiKey: this.aiConfig.apiKey || '',
    })
  }

  _calculateMessagesLength(messages) {
    return messages.reduce((total, msg) => {
      let length = 0
      if (msg.content) {
        length += typeof msg.content === 'string' ? msg.content.length : JSON.stringify(msg.content).length
      }
      if (msg.tool_calls) {
        length += JSON.stringify(msg.tool_calls).length
      }
      return total + length
    }, 0)
  }

  async _summarizeMessages(messages) {
    const summaryPrompt = `Please summarize the following conversation history concisely, focusing on:
1. The main task and goal
2. Key decisions and actions taken
3. Current progress and state
4. Important context needed for continuing the task

Keep the summary brief but comprehensive enough to continue the task effectively.

Conversation history:
${messages.map(m => {
  if (m.role === 'system') return `[SYSTEM]: ${m.content.substring(0, 200)}...`
  if (m.role === 'user') return `[USER]: ${m.content.substring(0, 500)}...`
  if (m.role === 'assistant') return `[ASSISTANT]: ${m.content ? m.content.substring(0, 500) : '[Tool calls]'}...`
  if (m.role === 'tool') return `[TOOL RESULT]: ${m.content.substring(0, 200)}...`
  return ''
}).join('\n')}`

    try {
      const response = await this.client.chat.completions.create({
        model: this.aiConfig.model,
        messages: [
          { role: 'system', content: 'You are a helpful assistant that creates concise summaries of conversations.' },
          { role: 'user', content: summaryPrompt }
        ],
        temperature: 0.3,
        max_tokens: 1000,
      })
      return response.choices[0].message.content
    } catch (error) {
      logError('Failed to summarize messages: ' + error.message)
      return 'Previous conversation history was too long and has been summarized. Please continue with the current task.'
    }
  }

  async _manageMessages(messages) {
    const currentLength = this._calculateMessagesLength(messages)
    const currentCount = messages.length

    if (currentLength > this.maxMessagesLength || currentCount > this.maxMessagesCount) {
      logInfo(`Managing messages: current length ${currentLength}, count ${currentCount}`)
      
      const systemMessage = messages.find(m => m.role === 'system')
      const userMessage = messages.find(m => m.role === 'user')
      
      const messagesToSummarize = messages.slice(2, -2)
      
      if (messagesToSummarize.length > 0) {
        const summary = await this._summarizeMessages(messagesToSummarize)
        
        const newMessages = [
          systemMessage,
          userMessage,
          {
            role: 'user',
            content: `[CONVERSATION SUMMARY]: ${summary}`
          }
        ]
        
        const lastTwoMessages = messages.slice(-2)
        newMessages.push(...lastTwoMessages)
        
        logInfo(`Messages compressed: ${messages.length} -> ${newMessages.length}`)
        return newMessages
      }
    }
    
    return messages
  }

  // 工作流循环
  async agentWorkflow(goal) {
    const extensionManager = this.aiCli.extensionManager
    const { toolDescriptions, toolFunctions } = extensionManager.extensions
    const currentDir = process.cwd();
    const osType = process.platform;
    
    let messages = [
      {
        role: 'system',
        content: `You are an AI assistant that can use tools to accomplish tasks. The current working directory is ${currentDir}, and the operating system is ${osType}. Use the available tools to achieve the user's goal.

IMPORTANT: When you have successfully completed the task, you MUST NOT call any more tools. Simply provide a summary of what was done in your response content and stop.

IMPORTANT: When using the executeJSCode function, if you need to import custom JS modules, you MUST use absolute paths.

IMPORTANT: To improve efficiency and reduce unnecessary round trips, STRONGLY prefer using the executeJSCode function combined with Node.js code to accomplish tasks quickly in a single or minimal number of calls. Avoid multiple back-and-forth interactions when a single comprehensive Node.js script can accomplish the goal. This saves time and network resources.

IMPORTANT: For file operations, ALWAYS check file information (size, line count) BEFORE reading file content using executeJSCode and Node.js fs module. If a file is large (>100KB or many lines), do NOT retrieve the entire file content into the conversation. Instead: 1) Use Node.js to process the file directly (read specific sections, search for patterns, parse and extract data), 2) Run transformations in Node.js scripts, 3) Only return the necessary results/summary, not the entire file content.

IMPORTANT: When handling large files (e.g., novels, long documents), use a chunked approach:
1. First, check the file size and structure
2. Process the file in manageable chunks (e.g., 10KB-50KB per chunk)
3. For translation tasks, translate one chunk at a time
4. Combine the results at the end
5. Use Node.js fs module to read specific file ranges using Buffer operations

IMPORTANT: The system will automatically truncate any tool response larger than 10KB. If you need to process large files, use the executeJSCode function to implement chunked processing directly in Node.js without returning the entire file content to the conversation.

CRITICAL FOR CONTENT GENERATION TASKS (e.g., writing novels, articles, long documents):
1. NEVER generate large amounts of content directly in the conversation - this will cause system errors
2. ALWAYS write content directly to files using createFile, modifyFile, or appendToFile tools
3. For very long content (e.g., novels, reports), generate in chunks and append to files progressively
4. Use executeJSCode to implement a loop that generates content in manageable sections and writes to files
5. Track progress using variables or files, and continue from where you left off
6. Example approach for writing a novel:
   - Create an outline first and save to a file
   - Write chapter by chapter, each chapter to a separate file
   - Use appendToFile to add sections progressively
   - Keep track of word count and progress in a separate tracking file
7. DO NOT return generated content in tool responses - only return status/progress information

IMPORTANT: The conversation history will be automatically summarized when it becomes too long. Always write important content to files immediately, as previous conversation details may be compressed.

TIP: You can use the executeJSCode function to run Node.js code for complex logic, and the executeCommand function to run system commands using command-line tools that are already installed on the system. This includes tools like git, npm, ls, mkdir, and other system utilities. These tools can help you quickly accomplish your goals.

IMPORTANT: When calling tool functions (executeJSCode, executeCommand, createFile, modifyFile, etc.), if the execution completes successfully without any errors or exceptions, consider the current objective accomplished. There is no need to verify the result or call additional tools to confirm the operation succeeded. Trust the successful execution and proceed to the next step or complete the task.`
      },
      {
        role: 'user',
        content: goal
      }
    ]

    let maxIterations = this.config.maxIterations || 10
    let loadingStop
    if (maxIterations === -1) {
      maxIterations = Infinity
    }
    try {
      while (maxIterations-- > 0) {
        messages = await this._manageMessages(messages)
        
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
                // 限制工具调用结果的大小，避免超出API限制
                let toolContent = JSON.stringify(result);
                const MAX_CONTENT_SIZE = 10000; // 10KB限制
                if (toolContent.length > MAX_CONTENT_SIZE) {
                  // 检查是否是文件内容
                  if (typeof result === 'string' && result.length > MAX_CONTENT_SIZE) {
                    // 对于大文件内容，只保留文件信息和大小
                    toolContent = JSON.stringify({
                      fileContent: `[TRUNCATED: File content too large (${Math.round(result.length / 1024)}KB). Use file processing tools to handle large files in chunks.`,
                      fileSize: result.length,
                      fileSizeKB: Math.round(result.length / 1024)
                    });
                  } else {
                    // 对于其他大结果，进行截断
                    toolContent = JSON.stringify({
                      truncated: true,
                      message: 'Result too large. Please use more specific queries or file processing tools.',
                      preview: toolContent.substring(0, MAX_CONTENT_SIZE) + '...'
                    });
                  }
                }
                messages.push({
                  role: 'tool',
                  tool_call_id: id,
                  content: toolContent
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
