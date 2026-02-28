# App.tsx Routes Update

Update your `App.tsx` to include the 5 new pages.

## Add Imports

At the top of `App.tsx`, add:

```typescript
// Google-Only Refactor Pages
import IntelligenceHubPage from './pages/IntelligenceHubPage';
import CampaignForgeGooglePage from './pages/CampaignForgeGooglePage';
import WebsiteBuilderGooglePage from './pages/WebsiteBuilderGooglePage';
import SettingsGooglePage from './pages/SettingsGooglePage';
import SubscriptionsPage from './pages/SubscriptionsPage';
```

## Add Routes

Replace the `<Routes>` section with:

```typescript
<Routes>
  {/* Dashboard */}
  <Route path="/" element={<DashboardPage />} />
  
  {/* Google-Only Refactor Features */}
  <Route path="/intelligence" element={<IntelligenceHubPage />} />
  <Route path="/campaigns" element={<CampaignForgeGooglePage />} />
  <Route path="/builder" element={<WebsiteBuilderGooglePage />} />
  <Route path="/settings" element={<SettingsGooglePage />} />
  <Route path="/subscriptions" element={<SubscriptionsPage />} />
  
  {/* Original Pages (Keep) */}
  <Route path="/extract" element={<ExtractPage />} />
  <Route path="/simulator" element={<BrandSimulatorPage />} />
  <Route path="/leads" element={<LeadHunterPage />} />
  <Route path="/agents" element={<AgentForgePage />} />
  <Route path="/sonic" element={<SonicLabPage />} />
  <Route path="/live" element={<LiveSessionPage />} />
  <Route path="/automations" element={<AutomationsPage />} />
  <Route path="/battle" element={<BattleModePage />} />
  <Route path="/affiliate" element={<AffiliateHubPage />} />
  <Route path="/scheduler" element={<SchedulerPage />} />
  <Route path="/admin" element={<AdminDashboard />} />
  <Route path="/landing" element={<LandingPage />} />
  <Route path="/share/:id" element={<SharedProfilePage />} />
  
  {/* Fallback */}
  <Route path="*" element={<Navigate to="/" replace />} />
</Routes>
```

## Update Layout/Navigation

Update your navigation component (e.g., `Layout.tsx` or sidebar) to include:

```typescript
// New Routes
<NavLink to="/intelligence">🧬 Intelligence Hub</NavLink>
<NavLink to="/campaigns">🚀 Campaign Forge</NavLink>
<NavLink to="/builder">🌐 Website Builder</NavLink>
<NavLink to="/settings">⚙️ Settings</NavLink>
<NavLink to="/subscriptions">💳 Subscriptions</NavLink>

// Keep Existing
<NavLink to="/leads">🔍 Lead Hunter</NavLink>
<NavLink to="/agents">🤖 Agent Forge</NavLink>
<NavLink to="/sonic">🎵 Sonic Lab</NavLink>
```

## Environment Variables

Add to `.env.local`:

```bash
VITE_GEMINI_API_KEY=sk-your-google-api-key-here
```

Get free key: https://ai.google.dev

## Complete App.tsx Template

Here's a minimal complete example:

```typescript
import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';

// Google-Only Refactor Pages
import IntelligenceHubPage from './pages/IntelligenceHubPage';
import CampaignForgeGooglePage from './pages/CampaignForgeGooglePage';
import WebsiteBuilderGooglePage from './pages/WebsiteBuilderGooglePage';
import SettingsGooglePage from './pages/SettingsGooglePage';
import SubscriptionsPage from './pages/SubscriptionsPage';

// Original Pages
import DashboardPage from './pages/DashboardPage';
import ExtractPage from './pages/ExtractPage';
import LeadHunterPage from './pages/LeadHunterPage';
import AgentForgePage from './pages/AgentForgePage';
import SonicLabPage from './pages/SonicLabPage';
import LiveSessionPage from './pages/LiveSessionPage';
import AutomationsPage from './pages/AutomationsPage';
import BattleModePage from './pages/BattleModePage';
import AffiliateHubPage from './pages/AffiliateHubPage';
import BrandSimulatorPage from './pages/BrandSimulatorPage';
import SchedulerPage from './pages/SchedulerPage';
import AdminDashboard from './pages/AdminDashboard';
import LandingPage from './pages/LandingPage';
import SharedProfilePage from './pages/SharedProfilePage';

export default function App() {
  useEffect(() => {
    const initializeApp = async () => {
      console.log('🚀 Sacred Core - Google-Only Refactor');
      // Initialization logic
    };
    initializeApp();
  }, []);

  return (
    <HashRouter>
      <Layout>
        <Routes>
          {/* Dashboard */}
          <Route path="/" element={<DashboardPage />} />
          
          {/* 🟢 NEW: Google-Only Refactor Pages */}
          <Route path="/intelligence" element={<IntelligenceHubPage />} />
          <Route path="/campaigns" element={<CampaignForgeGooglePage />} />
          <Route path="/builder" element={<WebsiteBuilderGooglePage />} />
          <Route path="/settings" element={<SettingsGooglePage />} />
          <Route path="/subscriptions" element={<SubscriptionsPage />} />
          
          {/* Keep Existing Pages */}
          <Route path="/extract" element={<ExtractPage />} />
          <Route path="/leads" element={<LeadHunterPage />} />
          <Route path="/agents" element={<AgentForgePage />} />
          <Route path="/sonic" element={<SonicLabPage />} />
          <Route path="/live" element={<LiveSessionPage />} />
          <Route path="/automations" element={<AutomationsPage />} />
          <Route path="/battle" element={<BattleModePage />} />
          <Route path="/affiliate" element={<AffiliateHubPage />} />
          <Route path="/simulator" element={<BrandSimulatorPage />} />
          <Route path="/scheduler" element={<SchedulerPage />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/landing" element={<LandingPage />} />
          <Route path="/share/:id" element={<SharedProfilePage />} />
          
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
}
```

## Verify Installation

After updating App.tsx:

```bash
# Check for import errors
npm run build

# Start dev server
npm run dev

# Test routes
# http://localhost:3001/#/intelligence
# http://localhost:3001/#/campaigns
# http://localhost:3001/#/builder
# http://localhost:3001/#/settings
# http://localhost:3001/#/subscriptions
```

## Test E2E

```bash
npm run test:e2e
```

All tests should pass with the new routes.

---

**Done!** Your app now has the Google-only refactor fully integrated.
