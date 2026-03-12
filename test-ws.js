
import WebSocket from 'ws';

const ws = new WebSocket('ws://localhost:4999/ws');

ws.on('open', () => {
  console.log('✅ Connection open');
  ws.send(JSON.stringify({ type: 'join', sessionId: 'test', userId: 'user1' }));
  
  setTimeout(() => {
    console.log('📡 Sending test message');
    ws.send(JSON.stringify({ type: 'message', sessionId: 'test', userId: 'user1', text: 'hello' }));
  }, 1000);
});

ws.on('message', (data) => {
  console.log('📩 Received:', data.toString());
});

ws.on('error', (err) => {
  console.error('❌ Error:', err.message);
});

ws.on('close', () => {
  console.log('🔌 Closed');
});

setTimeout(() => {
  console.log('⏰ Timeout');
  process.exit(0);
}, 5000);
