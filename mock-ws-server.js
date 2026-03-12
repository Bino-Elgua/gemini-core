
import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 5000 });
const activeSessions = new Map();

wss.on('connection', (ws) => {
  let currentSessionId = null;

  ws.on('message', (message) => {
    const payload = message.toString();
    
    try {
      const data = JSON.parse(payload);
      if (data.type === 'join') {
        currentSessionId = data.sessionId;
        if (!activeSessions.has(currentSessionId)) activeSessions.set(currentSessionId, new Set());
        activeSessions.get(currentSessionId).add(ws);
        ws.send(JSON.stringify({ type: 'joined' }));
      } else if (data.type === 'message') {
        const participants = activeSessions.get(data.sessionId);
        if (participants) {
          const broadcastData = JSON.stringify({
            type: 'broadcast',
            userId: data.userId,
            text: data.text,
            timestamp: data.timestamp
          });
          for (const socket of participants) {
            if (socket !== ws && socket.readyState === 1) {
              socket.send(broadcastData);
            }
          }
        }
      }
    } catch (e) {}
  });

  ws.on('close', () => {
    if (currentSessionId && activeSessions.has(currentSessionId)) {
      activeSessions.get(currentSessionId).delete(ws);
    }
  });
});

console.log('✅ Mock WebSocket Server running on ws://localhost:5000');
