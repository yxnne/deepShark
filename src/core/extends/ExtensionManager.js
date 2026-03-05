const { toolDescriptions, toolFunctions } = require('./DefaultExtension')

class ExtensionManager {
  constructor(aiCli) {
    this.aiCli = aiCli
    this.extensions = {
      toolDescriptions,
      toolFunctions,
    }
    this.parseExtends(this.aiCli.config.extensions || [])
  }

  parseExtends(configExtends) {
    for (const extensionPath of configExtends) {
      try {
        // 解析扩展路径
        const resolvedPath = path.isAbsolute(extensionPath)
          ? extensionPath
          : path.resolve(process.cwd(), extensionPath)

        if (!fs.existsSync(resolvedPath)) {
          console.error(`Extension file not found: ${resolvedPath}`)
          continue
        }

        // 动态加载扩展模块
        const { toolDescriptions, toolFunctions } = require(resolvedPath)

        this.extensions.toolDescriptions =
          this.extensions.toolDescriptions.concat(toolDescriptions)
        this.extensions.toolFunctions = Object.assign(
          this.extensions.toolFunctions,
          toolFunctions,
        )
      } catch (error) {
        console.error(
          `Error loading extension ${extensionPath}: ${error.message}`,
        )
      }
    }
    const toolFunctions = this.extensions.toolFunctions
    for (const fnName of Object.keys(toolFunctions)) {
      toolFunctions[fnName] = toolFunctions[fnName].bind(this.aiCli)
    }
  }
}

module.exports = ExtensionManager
