// Mock Redis client implementation
class Redis {
  constructor(options) {
    this.options = options;
    this.status = "ready";
    this.eventHandlers = {};
  }

  // Mock the event emitter methods
  on(event, callback) {
    this.eventHandlers[event] = callback;
    return this;
  }

  // Mock basic Redis commands
  get(key) {
    return Promise.resolve(null);
  }

  set(key, value) {
    return Promise.resolve("OK");
  }

  del(key) {
    return Promise.resolve(1);
  }

  connect() {
    return Promise.resolve();
  }

  keys() {
    return Promise.resolve([]);
  }
}

module.exports = Redis;
