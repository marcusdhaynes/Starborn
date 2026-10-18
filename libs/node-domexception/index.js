if (typeof globalThis !== 'undefined' && globalThis.DOMException) {
  module.exports = globalThis.DOMException;
} else if (typeof global !== 'undefined' && global.DOMException) {
  module.exports = global.DOMException;
} else {
  // Fallback for older environments
  module.exports = require('worker_threads').DOMException || Error;
}
