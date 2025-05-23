const core = require('@actions/core');

class Logger {
  constructor(context = '') {
    this.context = context;
  }

  info(message, data = null) {
    const logMessage = this.formatMessage('INFO', message, data);
    console.log(logMessage);
  }

  warn(message, data = null) {
    const logMessage = this.formatMessage('WARN', message, data);
    console.warn(logMessage);
    core.warning(logMessage);
  }

  error(message, error = null) {
    const logMessage = this.formatMessage('ERROR', message, error);
    console.error(logMessage);
    core.error(logMessage);

    if (error && error.stack) {
      console.error(error.stack);
    }
  }

  debug(message, data = null) {
    if (process.env.RUNNER_DEBUG === '1') {
      const logMessage = this.formatMessage('DEBUG', message, data);
      console.log(logMessage);
      core.debug(logMessage);
    }
  }

  formatMessage(level, message, data) {
    const timestamp = new Date().toISOString();
    const contextStr = this.context ? `[${this.context}]` : '';
    let logMessage = `${timestamp} ${level} ${contextStr} ${message}`;

    if (data) {
      if (data instanceof Error) {
        logMessage += ` - ${data.message}`;
      } else if (typeof data === 'object') {
        logMessage += ` - ${JSON.stringify(data, null, 2)}`;
      } else {
        logMessage += ` - ${data}`;
      }
    }

    return logMessage;
  }

  createChild(childContext) {
    const newContext = this.context ? `${this.context}:${childContext}` : childContext;
    return new Logger(newContext);
  }
}

module.exports = Logger;
