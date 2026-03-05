
const BaseAIService = require('./BaseAIService');

class OllamaService extends BaseAIService {
  constructor(aiCli) {
    super(aiCli);
    this.type = 'ollama';
  }
}

module.exports = OllamaService;