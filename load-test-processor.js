/**
 * Load Test Processor
 * Handles setup, teardown, and custom logic for load tests
 */

module.exports = {
  setup: function(context, ee, next) {
    console.log('🚀 Starting load test...');
    context.vars.startTime = Date.now();
    next();
  },

  beforeRequest: function(requestParams, context, ee, next) {
    // Add load test identifier
    requestParams.headers['X-Load-Test'] = 'true';
    requestParams.headers['X-Test-ID'] = context.vars.$uuid;
    next();
  },

  afterResponse: function(requestParams, response, context, ee, next) {
    const statusCode = response.statusCode;
    
    if (statusCode >= 500) {
      console.error(`❌ Server Error: ${statusCode} - ${requestParams.name}`);
      ee.emit('customStat', {
        stat: 'server_errors',
        value: 1,
      });
    } else if (statusCode >= 400) {
      console.warn(`⚠️ Client Error: ${statusCode} - ${requestParams.name}`);
      ee.emit('customStat', {
        stat: 'client_errors',
        value: 1,
      });
    } else {
      console.log(`✅ ${statusCode} - ${requestParams.name}`);
    }

    next();
  },

  cleanup: function(context, ee, next) {
    const duration = Date.now() - context.vars.startTime;
    console.log(`\n✨ Load test complete in ${duration}ms`);
    console.log('📊 Check artillery-report.json for detailed results');
    next();
  }
};
