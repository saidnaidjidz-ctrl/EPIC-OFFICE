const connections = new Map();

/**
 * Clean up an active user connection if it matches the current response object.
 * This avoids clearing a new connection when cleaning up an old, replaced connection.
 */
const cleanupConnection = (userId, res) => {
  const activeRes = connections.get(userId);
  if (activeRes === res) {
    if (res.pingInterval) {
      clearInterval(res.pingInterval);
    }
    connections.delete(userId);
    console.log(`[SSE] Connection cleaned up for user: ${userId}`);
  }
};

/**
 * Disconnects any active connection for a user.
 */
const disconnectUser = (userId) => {
  const res = connections.get(userId);
  if (res) {
    if (res.pingInterval) {
      clearInterval(res.pingInterval);
    }
    try {
      res.write('data: {"message":"Disconnected due to a new connection session"}\n\n');
      res.end();
    } catch (err) {
      console.error(`[SSE] Error ending connection for user ${userId}:`, err.message);
    }
    connections.delete(userId);
    console.log(`[SSE] Terminated existing connection session for user: ${userId}`);
  }
};

/**
 * Handles incoming SSE connection.
 * Enforces rate limit of 1 active connection per user.
 */
const handleConnect = (userId, res) => {
  // Enforce rate limit: 1 SSE connection per user
  disconnectUser(userId);

  // Set SSE Headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no', // Disable proxy buffering (Nginx, etc.)
  });
  res.flushHeaders();

  // Send initial connection verification comment
  res.write(':\n\n');

  // Auto-ping every 30 seconds to keep the connection alive
  const pingInterval = setInterval(() => {
    try {
      res.write(':\n\n');
    } catch (err) {
      console.error(`[SSE] Ping failed for user ${userId}, cleaning up:`, err.message);
      cleanupConnection(userId, res);
    }
  }, 30000);

  // Attach ping interval to res object
  res.pingInterval = pingInterval;

  // Store the connection mapping: userId -> response object
  connections.set(userId, res);
  console.log(`[SSE] Connection established for user: ${userId}`);

  // Handle client disconnect gracefully using res 'close' event
  res.on('close', () => {
    cleanupConnection(userId, res);
  });
};

/**
 * Sends a real-time notification payload to the connected user.
 */
const sendToUser = (userId, notification) => {
  const res = connections.get(userId);
  if (res) {
    try {
      res.write(`data: ${JSON.stringify(notification)}\n\n`);
      return true;
    } catch (err) {
      console.error(`[SSE] Failed to send message to user ${userId}, cleaning up:`, err.message);
      cleanupConnection(userId, res);
      return false;
    }
  }
  return false;
};

/**
 * Helper to check the current connection count.
 */
const getConnectionCount = () => {
  return connections.size;
};

module.exports = {
  handleConnect,
  sendToUser,
  disconnectUser,
  getConnectionCount,
  connections,
};
