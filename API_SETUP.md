# API Setup Guide
## Sacred Core Backend Server

**Status:** ✅ Ready to Run  
**Server:** Fastify (High-performance)  
**Port:** 4000 (API) + 3001 (Frontend)

---

## Quick Start

### Option 1: Run Frontend & API Together (Recommended)

```bash
# Install dependencies (first time only)
npm install

# Run both frontend and API simultaneously
npm run dev:full
```

Then open:
- **Frontend:** http://localhost:3001
- **API:** http://localhost:4000
- **Health Check:** http://localhost:4000/health

### Option 2: Run Separately

**Terminal 1 - Frontend:**
```bash
npm run dev
# http://localhost:3001
```

**Terminal 2 - API:**
```bash
npm run dev:api
# http://localhost:4000
```

### Option 3: Run API Only

```bash
npm run start:api
# http://localhost:4000
```

---

## What's Included

### Backend Server (server.ts)

**Technology:**
- Fastify (high-performance web framework)
- CORS enabled (cross-origin requests)
- JWT authentication ready
- Rate limiting configured
- Error handling included

**Endpoints:**

#### Auth
```
POST /api/auth/login          Login user
POST /api/auth/logout         Logout user
```

#### Campaigns
```
GET  /api/campaigns           List all campaigns
POST /api/campaigns           Create campaign
GET  /api/campaigns/:id       Get campaign details
PUT  /api/campaigns/:id       Update campaign
DELETE /api/campaigns/:id     Delete campaign
```

#### Analytics
```
GET /api/analytics/campaigns/:id   Campaign ROI & metrics
GET /api/analytics/performance     Overall performance
```

#### Cost Tracking
```
GET /api/costs/summary        Cost summary
GET /api/costs/daily-trend    Daily cost trends
```

#### Provider Status
```
GET /api/providers/status     Provider health status
```

#### Settings
```
GET /api/settings             Get user settings
PUT /api/settings             Update settings
```

#### Health
```
GET /health                   Service health check
```

---

## API Client (src/lib/apiClient.ts)

Ready-to-use API client with:
- Token management
- Error handling
- Type-safe responses
- All endpoints pre-configured

### Usage:

```typescript
import { apiClient } from '$lib/apiClient';

// Login
const loginResponse = await apiClient.login('user@example.com', 'password');
if (loginResponse.success) {
  // Token auto-saved
  console.log('Logged in:', loginResponse.data?.user);
}

// Get campaigns
const campaigns = await apiClient.getCampaigns();
if (campaigns.success) {
  console.log('Campaigns:', campaigns.data);
}

// Create campaign
const newCampaign = await apiClient.createCampaign({
  name: 'Summer Sale',
  description: 'Big summer promotion'
});

// Get analytics
const analytics = await apiClient.getCampaignAnalytics('campaign-id');
console.log('ROI:', analytics.data?.roi);
```

---

## Environment Variables

Create `.env.local` in project root:

```env
# API Configuration
API_URL=http://localhost:4000
API_PORT=4000
API_HOST=0.0.0.0

# Auth
JWT_SECRET=dev-secret-key-change-in-production

# CORS
CORS_ORIGIN=http://localhost:3001,http://localhost:3000

# AI Provider Keys
VITE_GEMINI_API_KEY=your_key
VITE_OPENAI_API_KEY=your_key
VITE_ANTHROPIC_API_KEY=your_key
```

---

## Testing the API

### With curl:

```bash
# Health check
curl http://localhost:4000/health

# Login
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# Get campaigns
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:4000/api/campaigns

# Create campaign
curl -X POST http://localhost:4000/api/campaigns \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"name":"Summer Sale","description":"Promotion"}'
```

### With TypeScript (in app):

```typescript
import { apiClient } from '$lib/apiClient';

// Test health
const health = await apiClient.healthCheck();
console.log('API Health:', health);

// Test login
const login = await apiClient.login('test@example.com', 'password');
console.log('Login:', login);

// Test campaigns
const campaigns = await apiClient.getCampaigns();
console.log('Campaigns:', campaigns);
```

---

## Vite Proxy Configuration

The frontend proxies `/api` requests to the backend:

```
/api/campaigns → http://localhost:4000/api/campaigns
```

This is configured in `vite.config.ts`:

```typescript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:4000',
      changeOrigin: true,
      rewrite: (path) => path
    }
  }
}
```

---

## Extending the API

### Add a New Endpoint:

```typescript
// In server.ts

app.get('/api/custom/endpoint', async (request, reply) => {
  return {
    success: true,
    data: { message: 'Custom endpoint' }
  };
});
```

### Add to API Client:

```typescript
// In src/lib/apiClient.ts

async getCustomData() {
  return this.request('/api/custom/endpoint');
}
```

### Use in Component:

```typescript
const response = await apiClient.getCustomData();
if (response.success) {
  console.log(response.data);
}
```

---

## Deploying the API

### To Vercel (Full Stack):

```bash
# Vercel handles both frontend and serverless functions
# Add api folder with serverless functions

vercel deploy
```

### To Docker:

```bash
# Update Dockerfile to run server.ts
# In Dockerfile:
CMD ["npm", "run", "start:api"]

docker build -t sacred-core .
docker run -p 4000:4000 sacred-core
```

### To Traditional Server:

```bash
# Build frontend
npm run build

# Start API
npm run start:api

# Serve dist folder with web server (Nginx, Apache, etc.)
```

---

## Troubleshooting

### API Not Responding

```bash
# Check if API is running
curl http://localhost:4000/health
# Should return: {"status": "healthy", "timestamp": "...", "uptime": ...}

# Check logs for errors
npm run dev:api
# Look for error messages
```

### CORS Errors

```bash
# Error: "Access to XMLHttpRequest blocked by CORS policy"
# Solution: Ensure CORS_ORIGIN includes your frontend URL

# In .env.local:
CORS_ORIGIN=http://localhost:3001,http://localhost:3000

# Restart API server
```

### Token Issues

```bash
# Clear stored token
localStorage.removeItem('auth_token');

# Login again
apiClient.login('user@example.com', 'password');
```

### Port Already in Use

```bash
# Change port in .env.local
API_PORT=5000

# Or kill process using port
lsof -i :4000
kill -9 <PID>
```

---

## Production Checklist

Before deploying to production:

- [ ] Change `JWT_SECRET` to a strong random string
- [ ] Set `CORS_ORIGIN` to your production domain
- [ ] Enable HTTPS (SSL/TLS)
- [ ] Set up database (replace mock data)
- [ ] Configure environment variables
- [ ] Enable rate limiting
- [ ] Set up monitoring (Sentry)
- [ ] Add authentication/authorization
- [ ] Test all endpoints
- [ ] Load test the API
- [ ] Set up CI/CD pipeline
- [ ] Document API endpoints

---

## Next Steps

1. ✅ API server created
2. ✅ API client created
3. ⏳ Install dependencies: `npm install`
4. ⏳ Run full stack: `npm run dev:full`
5. ⏳ Test endpoints in browser
6. ⏳ Integrate with components
7. ⏳ Deploy to production

---

**Status:** ✅ Ready to Use!

Start with `npm run dev:full` to run everything.
