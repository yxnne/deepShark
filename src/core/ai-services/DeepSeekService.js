
const BaseAIService = require('./BaseAIService');

class DeepSeekService extends BaseAIService {
  constructor(aiCli) {
    super(aiCli);
    this.type = 'deepseek';
  }
}

module.exports = DeepSeekService;