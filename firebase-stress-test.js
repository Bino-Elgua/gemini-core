
import WebSocket from 'ws';
import fs from 'fs';

const CONFIG = {
  CONCURRENT_CLIENTS: 1000,       // ENTERPRISE TARGET
  TEST_DURATION_MS: 45000,        // 45 seconds
  MESSAGE_INTERVAL_MS: 3000,      // 1 msg every 3s
  SHARD_URLS: [
    'ws://localhost:5000',
    'ws://localhost:5001',
    'ws://localhost:5002',
    'ws://localhost:5003'
  ],
  SESSION_COUNT: 20               // Test across 20 different sessions
};

const stats = {
  connections: 0,
  activeClients: 0,
  messagesSent: 0,
  messagesReceived: 0,
  latencies: [],
  errors: 0,
  startTime: Date.now(),
  shards: {}
};

// Deterministic shard resolver (matches client logic)
function getShardForSession(sessionId) {
  let hash = 5381;
  for (let i = 0; i < sessionId.length; i++) {
    hash = (hash * 33) ^ sessionId.charCodeAt(i);
  }
  const index = Math.abs(hash) % CONFIG.SHARD_URLS.length;
  return CONFIG.SHARD_URLS[index];
}

async function simulateClient(id) {
  const sessionId = `room_${Math.floor(id % CONFIG.SESSION_COUNT)}`;
  const shardUrl = getShardForSession(sessionId);
  const ws = new WebSocket(shardUrl);
  const clientId = `client_${id}`;

  if (!stats.shards[shardUrl]) stats.shards[shardUrl] = { connections: 0, messages: 0 };

  ws.on('open', () => {
    stats.connections++;
    stats.activeClients++;
    stats.shards[shardUrl].connections++;
    
    ws.send(JSON.stringify({
      type: 'join',
      sessionId: sessionId,
      userId: clientId
    }));

    const interval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        const payload = {
          type: 'message',
          sessionId: sessionId,
          userId: clientId,
          text: `Stress test message from ${clientId}`,
          timestamp: Date.now()
        };
        
        ws.send(JSON.stringify(payload));
        stats.messagesSent++;
        stats.shards[shardUrl].messages++;
      }
    }, CONFIG.MESSAGE_INTERVAL_MS + Math.random() * 1000);

    setTimeout(() => {
      clearInterval(interval);
      ws.close();
    }, CONFIG.TEST_DURATION_MS);
  });

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'broadcast' && msg.userId !== clientId) {
        stats.messagesReceived++;
        const latency = Date.now() - msg.timestamp;
        stats.latencies.push(latency);
      }
    } catch (e) {}
  });

  ws.on('error', (err) => {
    stats.errors++;
    // console.error(`Client ${clientId} error: ${err.message}`);
  });

  ws.on('close', () => {
    stats.activeClients--;
  });
}

async function runStressTest() {
  console.log(`🚀 STARTING SACRED CORE STRESS TEST: ${CONFIG.CONCURRENT_CLIENTS} CLIENTS`);
  
  for (let i = 0; i < CONFIG.CONCURRENT_CLIENTS; i++) {
    simulateClient(i);
    if (i % 100 === 0) console.log(`📡 Spawning clients: ${i}/${CONFIG.CONCURRENT_CLIENTS}...`);
    await new Promise(r => setTimeout(r, 10)); // Ramp up slowly
  }

  // Monitor progress
  const monitor = setInterval(() => {
    const elapsed = (Date.now() - stats.startTime) / 1000;
    console.log(`📊 [${elapsed.toFixed(1)}s] Active: ${stats.activeClients} | Sent: ${stats.messagesSent} | Recv: ${stats.messagesReceived} | Errors: ${stats.errors}`);
  }, 5000);

  // Final Report
  setTimeout(() => {
    clearInterval(monitor);
    console.log('\n🏁 STRESS TEST COMPLETE - FINAL REPORT');
    console.log('══════════════════════════════════════════════');
    
    const sorted = stats.latencies.sort((a, b) => a - b);
    const p50 = sorted[Math.floor(sorted.length * 0.5)] || 0;
    const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
    const p99 = sorted[Math.floor(sorted.length * 0.99)] || 0;

    const report = {
      config: CONFIG,
      summary: {
        totalConnections: stats.connections,
        totalMessagesSent: stats.messagesSent,
        totalMessagesReceived: stats.messagesReceived,
        successRate: ((stats.messagesReceived / (stats.messagesSent * (stats.activeClients || CONFIG.CONCURRENT_CLIENTS - 1))) * 100 || 0).toFixed(2),
        p50Latency: p50,
        p95Latency: p95,
        p99Latency: p99,
        totalErrors: stats.errors
      }
    };

    console.log(`✅ Total Connections: ${stats.connections}`);
    console.log(`✅ Total Messages:    ${stats.messagesSent}`);
    console.log(`✅ P50 Latency:       ${p50}ms`);
    console.log(`✅ P95 Latency:       ${p95}ms`);
    console.log(`✅ P99 Latency:       ${p99}ms`);
    console.log(`❌ Total Errors:      ${stats.errors}`);
    
    if (p95 < 50) console.log('\n🟢 PERFORMANCE: EXCEEDS ENTERPRISE TARGET (<50ms P95)');
    else if (p95 < 100) console.log('\n🟡 PERFORMANCE: WITHIN ACCEPTABLE LIMITS (<100ms P95)');
    else console.log('\n🔴 PERFORMANCE: BOTTLENECK DETECTED');
    
    fs.writeFileSync('stress-report.json', JSON.stringify(report, null, 2));
    process.exit(0);
  }, CONFIG.TEST_DURATION_MS + 10000);
}

runStressTest();
