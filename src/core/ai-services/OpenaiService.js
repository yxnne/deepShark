const BaseAIService = require('./BaseAIService');

class OpenaiService extends BaseAIService {
  constructor(aiCli) {
    super(aiCli);
    this.type = 'openai';
  }
}

module.exports = OpenaiService;