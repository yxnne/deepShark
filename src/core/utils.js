const chalk = require("chalk");
const path = require("path");
const os = require("os");
const fs = require("fs-extra");

// 日志相关工具函数
function logInfo(message) {
  log(message, "#6dd2ea");
}

function logSuccess(message) {
  log(message, "#9bed7f");
}

function logError(message) {
  log(message, "#ed7f7f");
}

function writeLine(msg1, msg2 = "", color = "blue") {
  if (color === "blue") {
    process.stdout.write("\r" + chalk.hex("#6dd2ea")(msg1) + " " + msg2);
  } else if (color === "green") {
    process.stdout.write("\r" + chalk.hex("#9bed7f")(msg1) + " " + msg2);
  } else if (color === "red") {
    process.stdout.write("\r" + chalk.hex("#ed7f7f")(msg1) + " " + msg2);
  } else {
    process.stdout.write("\r" + chalk.hex(color)(msg1) + " " + msg2);
  }
}

// 流式输出
async function streamOutput(text, color = "#9bed7f") {
  process.stdout.write(chalk.hex(color)(text));
}

// 流式换行
async function streamLineBreak() {
  process.stdout.write("\n");
}

function objStrToObj(str) {
  try {
    if (typeof str === 'string') {
      return eval(`(${str})`);
    } else {
      return str
    }
  } catch (error) {
    throw new Error(`对象转换失败：${error.message}`);
  }
}



function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function loading(label = "Thinking...") {
  let animationInterval;
  const spinners = ["|", "/", "-", "\\"];
  let spinnerIndex = 0;
  process.stdout.write("\r");
  animationInterval = setInterval(() => {
    writeLine(spinners[spinnerIndex], label);
    spinnerIndex = (spinnerIndex + 1) % spinners.length;
  }, 200);
  return (endLabel, isError = false) => {
    clearInterval(animationInterval);
    if (endLabel) {
      writeLine(endLabel, "", isError ? "red" : "green");
    }
    process.stdout.write("\r\n");
  };
}

function log(msg, color) {
  if (!color) {
    console.log(msg);
  } else {
    console.log(chalk.hex(color)(msg));
  }
}

// 添加扩展
function addExtensionToConfig(fileName) {
  // 检查 fileName 是否为空
  if (!fileName) {
    logError("Extension file name is required.");
    return;
  }
  const filePath = path.resolve(process.cwd(), fileName);
  // 判断是否路径是文件还是目录
  if (fs.statSync(filePath).isDirectory()) {
    // 扫描目录和子目录下所有js、cjs文件
    const files = traverseFiles()
    const jsFiles = files.filter((file) => file.endsWith(".js") || file.endsWith(".cjs"));
    jsFiles.forEach((jsFile) => {
      // 读取文件，查询文件内是否存在‘descriptions’和‘functions’
      const fileContent = fs.readFileSync(jsFile, "utf-8");
      if (fileContent.includes("descriptions") && fileContent.includes("functions")) {
        addExtensionToConfig(jsFile);
      }
    });
    return;
  }
  // 判断文件是否存在
  if (!fs.existsSync(filePath)) {
    logError(`File not found: ${filePath}`);
    return;
  }
  const userConfigPath = path.join(os.homedir(), ".ai-cmd.config.js");
  if (!fs.existsSync(userConfigPath)) {
    logError(
      `User config file not found: ${userConfigPath}. Please run 'ai config reset' first.`,
    );
    return;
  }
  const userConfig = require(userConfigPath);
  if (userConfig.extensions && Array.isArray(userConfig.extensions)) {
    userConfig.extensions.push(filePath);
  } else {
    userConfig.extensions = [filePath];
  }
  // 数组去重
  userConfig.extensions = [...new Set(userConfig.extensions)];
  fs.writeFileSync(
    userConfigPath,
    `module.exports = ${JSON.stringify(userConfig, null, 2)}`,
  );
  logSuccess(
    `Extension added to config: ${filePath}.`,
  );
}

// 移除扩展
function removeExtensionFromConfig(fileName) {
  const userConfigPath = path.join(os.homedir(), ".ai-cmd.config.js");
  if (!fs.existsSync(userConfigPath)) {
    logError(
      `User config file not found: ${userConfigPath}. Please run 'ai config reset' first.`,
    );
    return;
  }
  const userConfig = require(userConfigPath);
  // 增加对数字索引的支持
  if (!isNaN(Number(fileName))) {
    const extIndex = Number(fileName);
    if (extIndex < 0 || extIndex >= userConfig.extensions.length) {
      logError(`Invalid extension index: ${extIndex}`);
      return;
    }
    const filePath = userConfig.extensions.splice(extIndex, 1);
    fs.writeFileSync(
      userConfigPath,
      `module.exports = ${JSON.stringify(userConfig, null, 2)}`,
    );
    logSuccess(
      `Extension removed from config: ${filePath}.You can run 'ai ext ls' to view the changes.`,
    );
    return;
  }
  const filePath = path.resolve(process.cwd(), fileName);
  // 判断文件是否存在
  if (!fs.existsSync(filePath)) {
    logError(`File not found: ${filePath}`);
    return;
  }
  if (userConfig.extensions && Array.isArray(userConfig.extensions)) {
    userConfig.extensions = userConfig.extensions.filter(
      (ext) => ext !== filePath,
    );
  }
  fs.writeFileSync(
    userConfigPath,
    `module.exports = ${JSON.stringify(userConfig, null, 2)}`,
  );
  logSuccess(
    `Extension removed from config: ${filePath}.You can run 'ai ext ls' to view the changes.`,
  );
}

// 查看扩展列表
function viewExtensionsFromConfig() {
  const userConfigPath = path.join(os.homedir(), ".ai-cmd.config.js");
  if (!fs.existsSync(userConfigPath)) {
    logError(
      `User config file not found: ${userConfigPath}. Please run 'ai config reset' first.`,
    );
    return;
  }
  const userConfig = require(userConfigPath);
  if (userConfig.extensions && Array.isArray(userConfig.extensions)) {
    console.log("=".repeat(50));
    // 打印扩展列表，并加上索引
    if (userConfig.extensions.length === 0) {
      console.log(`No extensions in config.`);
    } else {
      console.log("Extensions in config:");
      userConfig.extensions.forEach((ext, index) => {
        console.log(`[${index}] ${ext}`);
      });
    }
    console.log("=".repeat(50));
  } else {
    logSuccess(`No extensions in config.`);
  }
}


function traverseFiles() {
  try {
    const currentDir = process.cwd();
    const allFiles = [];
    const currentItems = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const item of currentItems) {
      const itemPath = path.join(currentDir, item.name);
      if (item.isFile()) {
        allFiles.push(itemPath);
        continue;
      }
      if (item.isDirectory()) {
        try {
          const subItems = fs.readdirSync(itemPath, { withFileTypes: true });
          for (const subItem of subItems) {
            if (subItem.isFile()) {
              allFiles.push(path.join(itemPath, subItem.name));
            }
          }
        } catch (subErr) {
          console.warn(`读取子目录失败 ${itemPath}：${subErr.message}`);
        }
      }
    }
    return allFiles;
  } catch (err) {
    console.error(`遍历目录失败：${err.message}`);
    return [];
  }
}

// 获取配置文件所在目录
function getConfigPath() {
  return path.join(os.homedir(), ".ai-cmd.config.js");
}

module.exports = {
  logInfo,
  logSuccess,
  logError,
  loading,
  writeLine,
  streamOutput,
  streamLineBreak,
  addExtensionToConfig,
  removeExtensionFromConfig,
  viewExtensionsFromConfig,
  objStrToObj,
  delay,
  getConfigPath
};
