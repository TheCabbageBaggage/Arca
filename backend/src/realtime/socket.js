const { Server } = require('socket.io');
const { subscribe } = require('./bus');

function initializeSocketServer(httpServer, options = {}) {
  const io = new Server(httpServer, {
    cors: {
      origin: options.corsOrigin || '*',
      methods: ['GET', 'POST']
    },
    path: '/socket.io'
  });

  io.on('connection', (socket) => {
    socket.emit('arca:event', {
      type: 'realtime.connected',
      payload: { socket_id: socket.id },
      timestamp: new Date().toISOString()
    });
  });

  const unsubscribe = subscribe((event) => {
    io.emit('arca:event', event);
  });

  io.on('close', () => {
    unsubscribe();
  });

  return io;
}

module.exports = {
  initializeSocketServer
};
