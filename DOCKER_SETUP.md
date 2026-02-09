# Docker Setup Guide
## Sacred Core - Containerized Deployment

**Status:** ✅ Ready to Use  
**Components:** App, Database, Redis, Adminer UI

---

## Quick Start

### 1. Build and Run Locally

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down
```

**Access the app:**
- 👉 **Sacred Core:** http://localhost:3001
- 📊 **Adminer (DB UI):** http://localhost:8080
- 💾 **Redis:** localhost:6379

### 2. First Time Setup

```bash
# 1. Create .env file (if needed)
cp .env.example .env

# 2. Start services
docker-compose up -d

# 3. Wait for services to be healthy
docker-compose ps

# 4. View application logs
docker-compose logs app

# 5. Access at http://localhost:3001
```

---

## What's Included

### Services

| Service | Image | Purpose | Port |
|---------|-------|---------|------|
| **app** | Node 20 Alpine | Sacred Core app | 3001 |
| **db** | PostgreSQL 16 | Database | 5432 |
| **redis** | Redis 7 | Cache layer | 6379 |
| **adminer** | Adminer latest | DB management UI | 8080 |

### Features

✅ Multi-stage build (optimized images)  
✅ Health checks on all services  
✅ Volume persistence (data survives container restart)  
✅ Non-root user (security)  
✅ Network isolation  
✅ Auto-restart on failure  
✅ Proper signal handling  

---

## Usage Commands

### Container Management

```bash
# Start all services
docker-compose up -d

# Start in foreground (see logs)
docker-compose up

# Stop services
docker-compose stop

# Stop and remove containers
docker-compose down

# Remove volumes (DELETE DATA)
docker-compose down -v

# View running services
docker-compose ps

# View service status
docker-compose ps --status running
```

### Logs

```bash
# View all logs
docker-compose logs

# View app logs only
docker-compose logs app

# Follow app logs (real-time)
docker-compose logs -f app

# Last 100 lines
docker-compose logs --tail=100 app

# Logs with timestamps
docker-compose logs -t
```

### Execute Commands

```bash
# Run npm command in app
docker-compose exec app npm list

# Connect to database
docker-compose exec db psql -U postgres

# Run Redis CLI
docker-compose exec redis redis-cli

# Interactive shell in app
docker-compose exec app sh
```

### Rebuild

```bash
# Rebuild after code changes
docker-compose build

# Rebuild and restart
docker-compose up -d --build

# Rebuild without cache
docker-compose build --no-cache
```

---

## Database Management

### Using Adminer (Web UI)

1. Go to http://localhost:8080
2. Login with:
   - **Server:** db
   - **User:** postgres
   - **Password:** postgres (default)
   - **Database:** sacred_core

### Using psql (Command Line)

```bash
# Connect to database
docker-compose exec db psql -U postgres -d sacred_core

# Common commands
\dt              # List tables
\d table_name    # Describe table
SELECT * FROM table_name;  # Query
\q               # Quit
```

### Backup Database

```bash
# Backup to file
docker-compose exec db pg_dump -U postgres sacred_core > backup.sql

# Restore from file
docker-compose exec -T db psql -U postgres sacred_core < backup.sql
```

---

## Environment Variables

### Configuration

Create `.env` file in project root:

```env
# Application
NODE_ENV=production

# Database
DB_USER=postgres
DB_PASSWORD=your_secure_password
DB_HOST=db
DB_PORT=5432
DB_NAME=sacred_core

# API Keys (from your provider accounts)
VITE_GEMINI_API_KEY=your_key
VITE_OPENAI_API_KEY=your_key
VITE_ANTHROPIC_API_KEY=your_key
VITE_MISTRAL_API_KEY=your_key

# Supabase
VITE_SUPABASE_URL=your_url
VITE_SUPABASE_KEY=your_key

# Sentry
VITE_SENTRY_DSN=your_dsn
```

### Using Environment Variables

```yaml
# In docker-compose.yml
environment:
  DB_PASSWORD: ${DB_PASSWORD:-default_password}
```

Or pass via command line:

```bash
docker-compose up -d -e DB_PASSWORD=new_password
```

---

## Volumes & Persistence

### Named Volumes

```yaml
volumes:
  postgres_data:    # Database files
  redis_data:       # Cache data
```

### Checking Volumes

```bash
# List volumes
docker volume ls

# Inspect volume
docker volume inspect sacred-core_postgres_data

# See where data is stored
docker volume inspect sacred-core_postgres_data | grep Mountpoint
```

### Cleaning Up

```bash
# Remove unused volumes
docker volume prune

# Remove specific volume (WARNING: deletes data)
docker volume rm sacred-core_postgres_data
```

---

## Health Checks

### View Health Status

```bash
# Show all service health
docker-compose ps

# Expected output:
# app       running  (healthy)
# db        running  (healthy)
# redis     running  (healthy)
# adminer   running
```

### Manual Health Check

```bash
# Check app health
docker-compose exec app wget -q -O - http://localhost:3001

# Check database
docker-compose exec db pg_isready -U postgres

# Check redis
docker-compose exec redis redis-cli ping
```

---

## Networking

### Service Communication

Services can communicate using service names:

```typescript
// In app code
const dbUrl = 'postgresql://postgres:password@db:5432/sacred_core'
const redisUrl = 'redis://redis:6379'
```

### Expose Ports

Only needed ports are exposed:

```yaml
ports:
  - "3001:3001"  # App: accessible from host
  - "5432:5432"  # DB: accessible from host (optional)
  - "6379:6379"  # Redis: accessible from host (optional)
```

### Security

Remove port mappings if not needed:

```yaml
# Remove if database shouldn't be accessible from host
db:
  ports:
    - "5432:5432"  # ❌ Remove in production
```

---

## Production Deployment

### Docker Hub

```bash
# 1. Build image
docker build -t your-username/sacred-core:latest .

# 2. Tag versions
docker tag your-username/sacred-core:latest your-username/sacred-core:v1.0.0

# 3. Push to registry
docker login
docker push your-username/sacred-core:latest
docker push your-username/sacred-core:v1.0.0
```

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sacred-core
spec:
  replicas: 3
  selector:
    matchLabels:
      app: sacred-core
  template:
    metadata:
      labels:
        app: sacred-core
    spec:
      containers:
      - name: app
        image: your-registry/sacred-core:latest
        ports:
        - containerPort: 3001
        env:
        - name: NODE_ENV
          value: "production"
        resources:
          requests:
            memory: "256Mi"
            cpu: "500m"
          limits:
            memory: "512Mi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
```

### Cloud Deployment (AWS, GCP, Azure)

```bash
# AWS ECS
aws ecs register-task-definition --cli-input-json file://task-definition.json
aws ecs create-service --cluster production --service-name sacred-core --task-definition sacred-core

# Google Cloud Run
gcloud run deploy sacred-core --image gcr.io/your-project/sacred-core

# Azure Container Instances
az container create --name sacred-core --image your-registry/sacred-core:latest
```

---

## Troubleshooting

### App Container Exits

```bash
# Check logs
docker-compose logs app

# Common issues:
# - Port 3001 already in use: Change port in docker-compose.yml
# - Out of memory: Increase Docker memory limit
# - Database not ready: Services take time to start
```

### Database Connection Issues

```bash
# Check if db is running
docker-compose ps db

# Check db logs
docker-compose logs db

# Try connecting
docker-compose exec db psql -U postgres -c "SELECT 1"
```

### Build Issues

```bash
# Rebuild without cache
docker-compose build --no-cache

# Check Node version
docker-compose exec app node --version

# Check npm
docker-compose exec app npm --version
```

### Performance Issues

```bash
# Check resource usage
docker stats

# Increase limits in docker-compose.yml:
deploy:
  resources:
    limits:
      cpus: '2'
      memory: 1G
    reservations:
      cpus: '1'
      memory: 512M
```

---

## Best Practices

✅ **Always** use health checks  
✅ **Use** named volumes for persistence  
✅ **Run as** non-root user  
✅ **Keep** images small (multi-stage builds)  
✅ **Use** .dockerignore for speed  
✅ **Tag** images with versions  
✅ **Mount** source code in dev  
✅ **Use** environment variables for config  
✅ **Set** resource limits  
✅ **Monitor** container health  

---

## Common Patterns

### Development Setup

```bash
# docker-compose.override.yml (dev-specific overrides)
version: '3.9'
services:
  app:
    build: .
    command: npm run dev  # Use dev server
    volumes:
      - .:/app          # Mount source code
      - /app/node_modules
```

### Scaling

```bash
# docker-compose.scale.yml
version: '3.9'
services:
  app:
    deploy:
      replicas: 3  # Run 3 instances
```

### Monitoring

```bash
# Add monitoring service
services:
  prometheus:
    image: prom/prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"
```

---

## Next Steps

1. ✅ Files created (Dockerfile, docker-compose.yml, .dockerignore)
2. ⏳ Build images: `docker-compose build`
3. ⏳ Start services: `docker-compose up -d`
4. ⏳ Verify: `docker-compose ps`
5. ⏳ Access: http://localhost:3001
6. ⏳ Push to registry: `docker push your-registry/sacred-core`
7. ⏳ Deploy to production

---

## Resources

- **Docker Docs:** https://docs.docker.com
- **Docker Compose:** https://docs.docker.com/compose
- **Best Practices:** https://docs.docker.com/develop/dev-best-practices/
- **Registry:** https://hub.docker.com

---

**Status:** Ready to containerize! 🐳
