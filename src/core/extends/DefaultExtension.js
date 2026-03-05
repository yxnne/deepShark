const path = require('path')
const { spawn } = require('child_process')
const { logError, logSuccess, logInfo } = require('../utils')
const fs = require('fs-extra')

// 执行系统命令
async function executeCommand(command) {
  return new Promise((resolve, reject) => {
    logInfo(`Executing system command: ${command}`)

    const childProcess = spawn(command, {
      shell: true,
      cwd: process.cwd(),
      stdio: 'inherit',
    })

    childProcess.on('error', (error) => {
      logError(`Error executing system command: ${error.message}`)
      reject(error)
    })

    childProcess.on('close', (code) => {
      if (code !== 0) {
        const error = new Error(`System command failed with exit code ${code}`)
        logError(`Error executing system command: ${error.message}`)
        reject(error)
        return
      }
      logSuccess(`System command executed successfully`)
      resolve('System command executed successfully')
    })
  })
}

// 请求ai服务
async function requestAI(systemDescription, prompt) {
  if (
    typeof systemDescription === 'object' &&
    systemDescription.systemDescription
  ) {
    prompt = systemDescription.prompt || prompt || ''
    systemDescription = systemDescription.systemDescription || ''
  }
  try {
    const response = await this.aiService.derictGenerateResponse(
      systemDescription,
      prompt
    )
    return response
  } catch (error) {
    logError(`Error executing AI function: ${error.message}`)
    throw error
  }
}

// 执行js代码
async function executeJSCode(code) {
  console.log(`Executing JavaScript code: ${code}`)
  try {
    const { toolFunctions } = this.extensionManager.extensions
    const Func = new Function(
      'Tools',
      'require',
      'return (async () => { ' + code + ' })()',
    )
    const result = await Func(
      toolFunctions,
      require,
    )
    return result || ''
  } catch (error) {
    console.log(`Error executing code: ${error.stack}`)
    throw error
  }
}

async function createFile(filePath, content) {
  try {
    const fullPath = path.resolve(process.cwd(), filePath)
    const dirPath = path.dirname(fullPath)

    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true })
    }
    fs.writeFileSync(fullPath, content)
    return true
  } catch (error) {
    return false
  }
}

async function modifyFile(filePath, content) {
  try {
    const fullPath = path.resolve(process.cwd(), filePath)

    if (!fs.existsSync(fullPath)) {
      return false
    }

    fs.writeFileSync(fullPath, content)
    return true
  } catch (error) {
    return false
  }
}

async function readFile(filePath) {
  try {
    const fullPath = path.resolve(process.cwd(), filePath)

    if (!fs.existsSync(fullPath)) {
      return null
    }

    const content = fs.readFileSync(fullPath, 'utf8')
    return content
  } catch (error) {
    return null
  }
}

async function appendToFile(filePath, content) {
  try {
    const fullPath = path.resolve(process.cwd(), filePath)

    if (!fs.existsSync(fullPath)) {
      return false
    }

    fs.appendFileSync(fullPath, content)
    return true
  } catch (error) {
    return false
  }
}

function fileExists(filePath) {
  const fullPath = path.resolve(process.cwd(), filePath)
  return fs.existsSync(fullPath)
}

async function createDirectory(dirPath) {
  try {
    const fullPath = path.resolve(process.cwd(), dirPath)
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true })
    }
    return true
  } catch (error) {
    return false
  }
}

async function deleteFile(filePath) {
  try {
    const fullPath = path.resolve(process.cwd(), filePath)

    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath)
    }
    return true
  } catch (error) {
    return false
  }
}

async function deleteDirectory(dirPath) {
  try {
    const fullPath = path.resolve(process.cwd(), dirPath)

    if (fs.existsSync(fullPath)) {
      fs.rmSync(fullPath, { recursive: true, force: true })
    }
    return true
  } catch (error) {
    return false
  }
}

async function rename(oldPath, newPath) {
  try {
    const fullOldPath = path.resolve(process.cwd(), oldPath)
    const fullNewPath = path.resolve(process.cwd(), newPath)

    if (fs.existsSync(fullOldPath)) {
      fs.renameSync(fullOldPath, fullNewPath)
    }
    return true
  } catch (error) {
    return false
  }
}

async function moveFile(sourcePath, destinationPath) {
  try {
    const fullSourcePath = path.resolve(process.cwd(), sourcePath)
    const fullDestPath = path.resolve(process.cwd(), destinationPath)
    const destDirPath = path.dirname(fullDestPath)

    if (!fs.existsSync(destDirPath)) {
      fs.mkdirSync(destDirPath, { recursive: true })
    }

    if (fs.existsSync(fullSourcePath)) {
      fs.renameSync(fullSourcePath, fullDestPath)
    }
    return true
  } catch (error) {
    return false
  }
}

async function getFileInfo(filePath) {
  try {
    const fullPath = path.resolve(process.cwd(), filePath)

    if (!fs.existsSync(fullPath)) {
      return null
    }

    const stats = fs.statSync(fullPath)
    return {
      path: fullPath,
      size: stats.size,
      birthtime: stats.birthtime,
      mtime: stats.mtime,
      ctime: stats.ctime,
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory(),
    }
  } catch (error) {
    return null
  }
}

async function getFileNameList(dirPath) {
  try {
    const fullPath = path.resolve(process.cwd(), dirPath)
    if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isDirectory()) {
      return []
    }
    const files = fs.readdirSync(fullPath)
    return files
  } catch (error) {
    return []
  }
}

async function clearDirectory(dirPath) {
  try {
    const fullPath = path.resolve(process.cwd(), dirPath)

    if (!fs.existsSync(fullPath)) {
      return false
    }

    if (!fs.statSync(fullPath).isDirectory()) {
      return false
    }

    const files = fs.readdirSync(fullPath)

    for (const file of files) {
      const filePath = path.join(fullPath, file)
      if (fs.statSync(filePath).isDirectory()) {
        fs.rmSync(filePath, { recursive: true, force: true })
      } else {
        fs.unlinkSync(filePath)
      }
    }

    return true
  } catch (error) {
    return false
  }
}

const toolDescriptions = [
  {
    type: 'function',
    function: {
      name: 'executeCommand',
      description: '执行系统命令',
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string' }
        },
        required: ['command']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'requestAI',
      description: '请求AI服务处理简单任务，如随机生成一段话、翻译文本、数学计算、代码分析、知识检索等。通过systemDescription参数指定AI的行为和限制，prompt参数输入任务描述。返回AI处理后的结果，仅包含所需的输出内容，不包含任何解释或额外信息，确保返回的结果能够被解析。',
      parameters: {
        type: 'object',
        properties: {
          systemDescription: { type: 'string' },
          prompt: { type: 'string' }
        },
        required: ['systemDescription', 'prompt']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'executeJSCode',
      description: '执行JavaScript代码。代码中可以直接调用工作流工具函数(通过Tools命名空间直接调用，无需引入模块，注意这些函数都是异步函数，调用时需要注意,例如await Tools.createDirectory("新建目录"))，从而与其他工具协同工作',
      parameters: {
        type: 'object',
        properties: {
          code: { type: 'string' }
        },
        required: ['code']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'createFile',
      description: '创建一个包含指定内容的新文件',
      parameters: {
        type: 'object',
        properties: {
          filePath: { type: 'string' },
          content: { type: 'string' }
        },
        required: ['filePath', 'content']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'modifyFile',
      description: '修改指定文件的内容',
      parameters: {
        type: 'object',
        properties: {
          filePath: { type: 'string' },
          content: { type: 'string' }
        },
        required: ['filePath', 'content']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'readFile',
      description: '读取指定文件的内容，返回文件内容的字符串',
      parameters: {
        type: 'object',
        properties: {
          filePath: { type: 'string' }
        },
        required: ['filePath']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'appendToFile',
      description: '向指定文件追加内容',
      parameters: {
        type: 'object',
        properties: {
          filePath: { type: 'string' },
          content: { type: 'string' }
        },
        required: ['filePath', 'content']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'fileExists',
      description: '检查指定文件是否存在，返回true或false',
      parameters: {
        type: 'object',
        properties: {
          filePath: { type: 'string' }
        },
        required: ['filePath']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'createDirectory',
      description: '创建一个新目录',
      parameters: {
        type: 'object',
        properties: {
          dirPath: { type: 'string' }
        },
        required: ['dirPath']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'deleteFile',
      description: '删除指定文件',
      parameters: {
        type: 'object',
        properties: {
          filePath: { type: 'string' }
        },
        required: ['filePath']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'deleteDirectory',
      description: '删除指定目录',
      parameters: {
        type: 'object',
        properties: {
          dirPath: { type: 'string' }
        },
        required: ['dirPath']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'rename',
      description: '重命名文件或目录',
      parameters: {
        type: 'object',
        properties: {
          oldPath: { type: 'string' },
          newPath: { type: 'string' }
        },
        required: ['oldPath', 'newPath']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'moveFile',
      description: '移动文件',
      parameters: {
        type: 'object',
        properties: {
          sourcePath: { type: 'string' },
          destinationPath: { type: 'string' }
        },
        required: ['sourcePath', 'destinationPath']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getFileInfo',
      description: '获取指定文件的信息，返回文件信息的对象',
      parameters: {
        type: 'object',
        properties: {
          filePath: { type: 'string' }
        },
        required: ['filePath']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getFileNameList',
      description: '获取指定目录下的所有文件名，返回文件名数组',
      parameters: {
        type: 'object',
        properties: {
          dirPath: { type: 'string' }
        },
        required: ['dirPath']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'clearDirectory',
      description: '清空指定目录的内容',
      parameters: {
        type: 'object',
        properties: {
          dirPath: { type: 'string' }
        },
        required: ['dirPath']
      }
    }
  }
]
const toolFunctions = {
  executeCommand,
  requestAI,
  executeJSCode,
  createFile,
  modifyFile,
  readFile,
  appendToFile,
  fileExists,
  createDirectory,
  deleteFile,
  deleteDirectory,
  rename,
  moveFile,
  getFileInfo,
  getFileNameList,
  clearDirectory,
}

module.exports = {
  toolDescriptions,
  toolFunctions,
}
