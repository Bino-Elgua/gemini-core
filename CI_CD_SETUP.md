# CI/CD Pipeline Setup Guide
## GitHub Actions for Sacred Core

**Status:** ✅ Ready to Configure  
**Workflows:** 3 (test, staging, production)

---

## Overview

Sacred Core includes a complete CI/CD pipeline using GitHub Actions:

1. **Test & Quality** (`.github/workflows/test.yml`)
   - Runs on: Push to any branch, Pull requests
   - Checks: TypeScript, ESLint, Build, Bundle size
   - Artifacts: Build output (Node 18 & 20)

2. **Deploy to Staging** (`.github/workflows/deploy-staging.yml`)
   - Trigger: Push to `develop` branch
   - Actions: Test → Build → Deploy to staging
   - Target: Staging environment

3. **Deploy to Production** (`.github/workflows/deploy-production.yml`)
   - Trigger: Push to `main` branch or create tag
   - Actions: Full test suite → Build → Docker → Deploy
   - Target: Production environment

---

## Quick Start

### 1. Push Workflows to GitHub

```bash
git add .github/
git commit -m "ci/cd: add GitHub Actions workflows"
git push origin main
```

The workflows are now active on GitHub!

### 2. Configure Deployment Targets

#### For Vercel (Recommended for Frontend)
```bash
npm install -g vercel

# Link your project
vercel link

# Set up environment variables
vercel env add VITE_API_URL
vercel env add VITE_SUPABASE_URL
```

#### For Docker Registry (if using containers)
```bash
# Configure in GitHub Settings → Secrets & variables

DOCKER_USERNAME=your_username
DOCKER_PASSWORD=your_token
DOCKER_REGISTRY=docker.io
```

#### For Kubernetes (if using K8s)
```bash
# Configure kubeconfig as secret
KUBECONFIG=<base64-encoded-kubeconfig>
```

---

## Configuration Steps

### Step 1: Add GitHub Secrets

Go to **GitHub Repository → Settings → Secrets and variables → Actions**

Add these secrets:

**For Staging Deployment:**
```
STAGING_API_URL=https://staging-api.sacred-core.com
STAGING_DEPLOY_TOKEN=your_token
```

**For Production Deployment:**
```
PRODUCTION_API_URL=https://api.sacred-core.com
PRODUCTION_DEPLOY_TOKEN=your_token
DOCKER_USERNAME=your_registry_username
DOCKER_PASSWORD=your_registry_password
```

**For Notifications:**
```
SLACK_WEBHOOK=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

### Step 2: Configure Deployment Command

Edit `.github/workflows/deploy-staging.yml`:

```yaml
# Replace the placeholder with your actual command:
- name: Deploy to Staging
  run: vercel deploy --token ${{ secrets.VERCEL_TOKEN }}
```

Edit `.github/workflows/deploy-production.yml`:

```yaml
# Replace with your production deployment:
- name: Deploy to production
  run: |
    docker push ${{ secrets.DOCKER_REGISTRY }}/sacred-core:latest
    # or
    vercel deploy --prod --token ${{ secrets.VERCEL_TOKEN }}
```

### Step 3: Set Branch Protection Rules

Go to **Settings → Branches → Add rule**

Configure for `main` branch:
- ✅ Require status checks to pass
- ✅ Require test workflow to pass
- ✅ Require pull request reviews
- ✅ Require branches to be up to date

---

## How It Works

### Test Workflow (Every Push & PR)

```
Push code
    ↓
GitHub Actions triggers
    ↓
Install dependencies
    ↓
TypeScript type checking
    ↓
ESLint validation
    ↓
Build production bundle
    ↓
Verify bundle size < 300KB
    ↓
Upload build artifact
    ↓
Status badge: ✅ PASS or ❌ FAIL
```

### Staging Deployment (Push to develop)

```
Push to develop branch
    ↓
Test workflow runs (must pass)
    ↓
Build production bundle
    ↓
Deploy to staging environment
    ↓
Post-deployment verification
    ↓
Slack notification
```

### Production Deployment (Push to main)

```
Push to main or create tag
    ↓
Full test suite (TypeScript, ESLint, Build)
    ↓
Build Docker image
    ↓
Deploy to production
    ↓
Health checks & smoke tests
    ↓
Create GitHub release
    ↓
Slack notification
```

---

## Usage Examples

### Deploying a Feature

```bash
# 1. Create feature branch
git checkout -b feature/my-feature

# 2. Make changes
git add .
git commit -m "feat: add my feature"
git push origin feature/my-feature

# 3. Create Pull Request
# GitHub Actions automatically runs tests
# ✅ If tests pass → Ready to merge
# ❌ If tests fail → Fix errors and push

# 4. Merge to develop (or main)
git checkout develop
git merge feature/my-feature
git push origin develop

# ✅ Staging deployment starts automatically
```

### Deploying to Production

```bash
# Option 1: Push to main branch
git checkout main
git merge develop
git push origin main
# ✅ Production deployment starts automatically

# Option 2: Create a release tag
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
# ✅ Production deployment starts automatically
# ✅ GitHub release is created automatically
```

---

## Monitoring Builds

### GitHub UI

1. Go to **Actions** tab in GitHub
2. See all workflow runs
3. Click on any run to see details
4. View logs for each step

### Status Badge

Add to your README.md:

```markdown
![Tests](https://github.com/your-username/Sacred-core/workflows/Test%20&%20Quality/badge.svg)
![Deploy Staging](https://github.com/your-username/Sacred-core/workflows/Deploy%20to%20Staging/badge.svg)
![Deploy Production](https://github.com/your-username/Sacred-core/workflows/Deploy%20to%20Production/badge.svg)
```

---

## Troubleshooting

### Build Fails with "TypeScript Error"

**Problem:** `npm run type-check` fails

**Solution:**
```bash
# Fix locally first
npm run type-check

# Commit the fix
git add .
git commit -m "fix: typescript errors"
git push
```

### Build Fails with "ESLint Error"

**Problem:** `npm run lint` fails

**Solution:**
```bash
# Fix locally
npm run lint -- --fix

# Commit
git add .
git commit -m "fix: linting issues"
git push
```

### Build Fails with "Bundle Too Large"

**Problem:** dist/ > 300KB

**Solution:**
```bash
# Check bundle size
npm run build
du -sh dist/

# Optimize:
# 1. Remove unused dependencies: npm prune --production
# 2. Check for large libraries: npm ls
# 3. Use code splitting
# 4. Lazy load components
```

### Deployment Fails

**Problem:** Deploy step fails

**Solution:**
1. Check secrets are configured: **Settings → Secrets**
2. Verify deployment token is valid
3. Check deployment target is running
4. Review workflow logs for exact error

---

## Advanced Configuration

### Matrix Testing (Multiple Node Versions)

Already configured in `test.yml` for Node 18 & 20.

To add more:
```yaml
matrix:
  node-version: [18.x, 19.x, 20.x]
```

### Caching Dependencies

Already configured with:
```yaml
cache: 'npm'
```

This speeds up subsequent runs.

### Conditional Steps

Skip steps based on conditions:
```yaml
if: success()  # Only run if previous steps succeeded
if: failure()  # Only run if previous steps failed
if: always()   # Always run
if: startsWith(github.ref, 'refs/tags/')  # Only on tags
```

### Parallel Jobs

Run jobs simultaneously:
```yaml
jobs:
  test:
    runs-on: ubuntu-latest
  build:
    runs-on: ubuntu-latest
  deploy:
    needs: [test, build]  # Wait for both to complete
    runs-on: ubuntu-latest
```

---

## Integration with Services

### Slack Notifications

```yaml
- name: Notify Slack
  uses: slackapi/slack-github-action@v1
  with:
    webhook-url: ${{ secrets.SLACK_WEBHOOK }}
    payload: |
      {
        "text": "Deployment successful: ${{ github.ref }}"
      }
```

### Email Notifications

Configure in **Settings → Notifications**

### Sentry Release Tracking

```yaml
- name: Create Sentry release
  run: |
    curl https://sentry.io/api/0/organizations/YOUR-ORG/releases/ \
      -H "Authorization: Bearer ${{ secrets.SENTRY_AUTH_TOKEN }}" \
      -d "version=${{ github.sha }}"
```

---

## Best Practices

✅ **Always** run tests before deploying  
✅ **Use** branch protection for main branch  
✅ **Require** pull request reviews  
✅ **Test** on multiple Node versions  
✅ **Cache** dependencies for speed  
✅ **Monitor** workflow runs  
✅ **Keep** secrets out of code  
✅ **Document** deployment procedures  

---

## Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| "npm: command not found" | Node not installed | Check Node version in workflow |
| "Secret not found" | Missing in GitHub secrets | Add to Settings → Secrets |
| "Bundle too large" | Unused dependencies | Run `npm prune --production` |
| "Port already in use" | Conflict during test | Check for hanging processes |
| "Permission denied" | Insufficient tokens | Verify GitHub token has correct scopes |

---

## Next Steps

1. ✅ Workflows are defined
2. ⏳ Push to GitHub (workflows auto-activate)
3. ⏳ Configure GitHub Secrets
4. ⏳ Set up branch protection rules
5. ⏳ Configure deployment targets
6. ⏳ Monitor first deployments
7. ⏳ Optimize based on results

---

## Support

For help:
- **GitHub Actions Docs:** https://docs.github.com/actions
- **Workflow Syntax:** https://docs.github.com/actions/using-workflows/workflow-syntax-for-github-actions
- **Debugging:** Enable debug logging with `ACTIONS_STEP_DEBUG=true`

---

**Status:** Ready to deploy! 🚀
