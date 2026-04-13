const { EventEmitter } = require('events');

const bus = new EventEmitter();
bus.setMaxListeners(100);

function publishEvent(type, payload = {}) {
  const event = {
    type,
    payload,
    timestamp: new Date().toISOString()
  };

  bus.emit('event', event);
  return event;
}

function subscribe(listener) {
  bus.on('event', listener);
  return () => bus.off('event', listener);
}

module.exports = {
  publishEvent,
  subscribe
};
