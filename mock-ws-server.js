import { WebSocketServer } from 'ws';

/**
 * Enterprise Mock Sharded WebSocket Server
 * Simulates multiple Firebase Realtime DB shards on different ports
 */

const SHARD_PORTS = [5000, 5001, 5002, 5003];
const shards = [];

SHARD_PORTS.forEach((port, index) => {
  const wss = new WebSocketServer({ port });
  const activeSessions = new Map();
  const shardId = `shard-0${index + 1}`;

  wss.on('connection', (ws) => {
    let currentSessionId = null;

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === 'join') {
          currentSessionId = data.sessionId;
          if (!activeSessions.has(currentSessionId)) {
            activeSessions.set(currentSessionId, new Set());
          }
          activeSessions.get(currentSessionId).add(ws);
          
          console.log(`📡 [${shardId}] User ${data.userId} joined session ${currentSessionId}`);
          ws.send(JSON.stringify({ type: 'joined', shardId }));
          
        } else if (data.type === 'message') {
          const participants = activeSessions.get(data.sessionId);
          if (participants) {
            const broadcastData = JSON.stringify({
              type: 'broadcast',
              userId: data.userId,
              text: data.text,
              timestamp: data.timestamp,
              shardId
            });
            
            let count = 0;
            for (const socket of participants) {
              if (socket !== ws && socket.readyState === 1) {
                socket.send(broadcastData);
                count++;
              }
            }
            // console.log(`📤 [${shardId}] Broadcasted message in ${data.sessionId} to ${count} peers`);
          }
        }
      } catch (e) {
        console.error(`❌ [${shardId}] Message error:`, e.message);
      }
    });

    ws.on('close', () => {
      if (currentSessionId && activeSessions.has(currentSessionId)) {
        activeSessions.get(currentSessionId).delete(ws);
        if (activeSessions.get(currentSessionId).size === 0) {
          activeSessions.delete(currentSessionId);
        }
      }
    });
  });

  console.log(`✅ Shard ${shardId} running on ws://localhost:${port}`);
  shards.push(wss);
});

console.log(`\n🚀 SACRED CORE SHARDED EMULATOR LIVE: ${SHARD_PORTS.length} SHARDS`);
