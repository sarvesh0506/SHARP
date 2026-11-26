# SHARP — Official Color Identity Transformation

## 1. Official SHARP Color Palette
All pages, components, charts, navigation, modals, forms, status badges, and notifications across the SHARP frontend now share a single unified visual identity derived from the five official brand colors:

| Role | Name | Hex | Usage |
| :--- | :--- | :--- | :--- |
| Primary Brand | **Deep Sage** | `#5D7B6F` | Primary buttons, active navigation, key interactive emphasis, primary chart series |
| Secondary Accent | **Soft Sage** | `#A4C3A2` | Secondary accents, subtle borders, hover states, supporting chart series |
| Healthy / Positive | **Mint Green** | `#B0D4B8` | Healthy states, verification success, online indicators, positive metrics |
| Neutral / Contrast | **Warm Cream** | `#EAE7D6` | Primary text (`--text-main`), neutral surfaces, high-contrast warning/critical framing |
| Intelligence / Info | **Ice Cyan** | `#D7F9FA` | AI intelligence highlights, informational notifications, focus rings, info chart series |

---

## 2. Centralized Color Token System (`frontend/src/index.css` & `tailwind.config.js`)
- **Official Palette Tokens**:
  - `--sharp-deep-sage: #5D7B6F`
  - `--sharp-soft-sage: #A4C3A2`
  - `--sharp-mint: #B0D4B8`
  - `--sharp-warm-cream: #EAE7D6`
  - `--sharp-ice-cyan: #D7F9FA`
- **Derived Forest-Sage Dark Surface Tokens** (for enterprise legibility):
  - `--bg-main: #0D1311`, `--bg-sidebar: #111916`, `--bg-card: #16211D`, `--bg-elevated: #1D2B26`, `--bg-input: #101815`
  - `--bg-hover: rgba(164, 195, 162, 0.1)`, `--bg-active: rgba(93, 123, 111, 0.24)`
- **Typography & Borders**:
  - `--text-main: var(--sharp-warm-cream)`, `--text-secondary: #D4D2C4`, `--text-muted: #98AB9C`, `--text-on-sage: #F6F4EC`
  - `--border-subtle: rgba(164, 195, 162, 0.16)`, `--border-strong: rgba(164, 195, 162, 0.34)`
  - `--focus-ring: 0 0 0 2px rgba(215, 249, 250, 0.45)`

---

## 3. Chart Color System (`frontend/src/theme/chartColors.ts`)
Centralized `SHARP_CHART_COLORS` and `SHARP_CHART_SERIES` govern all Recharts visualizations (`DashboardPage`, `SystemMonitoringPage`, `AnalyticsPage`):
- Primary series: `#5D7B6F` (Deep Sage)
- Secondary series: `#A4C3A2` (Soft Sage)
- Success/Disk/Resolved series: `#B0D4B8` (Mint Green)
- Informational/CPU/Actions series: `#D7F9FA` (Ice Cyan)
- Neutral/Anomalies series: `#EAE7D6` (Warm Cream)
- Grid & Axis: `rgba(164, 195, 162, 0.14)` / `#98AB9C`

---

## 4. Status & Severity Visual System (`StatusBadge.tsx`, `MetricBar.tsx`, `Toast.tsx`, `ConfirmDialog.tsx`)
Backend severity and lifecycle logic are unchanged. Visual states use the official palette plus borders, contrast, and iconography:
- **Healthy / Success / Resolved / Online**: Mint Green (`#B0D4B8`) fill tint, border, and dot/icon.
- **Info / AI Intelligence**: Ice Cyan (`#D7F9FA`) fill tint and border.
- **Warning / Recovering / Degraded**: Warm Cream (`#EAE7D6`) with dashed border (`border-dashed border-[#EAE7D6]/45`).
- **Critical / Offline / Failed**: High-contrast Warm Cream (`#EAE7D6`) with double-ring border (`border-[#EAE7D6]/75 ring-1 ring-[#EAE7D6]/30`) and high-contrast solid Warm Cream buttons with `#0D1311` text.

---

## 5. Legacy Colors Removed
- **Violet / Purple**: `#7C3AED`, `#6D28D9`, `#A78BFA`, `violet-*`, `purple-*`
- **Legacy Emerald / Green**: `#10B981`, `#34D399`, `#059669`, `#04120D`, `emerald-*`, `green-*`, `teal-*`
- **Legacy Electric Blue / Cyan**: `#38BDF8`, `#22D3EE`, `#00D9FF`, `#33E1FF`, `#7DD3FC`, `sky-*`, `cyan-*`, `blue-*`, `indigo-*`
- **Legacy Orange / Amber / Red / Rose**: `#F59E0B`, `#D97706`, `#FCD34D`, `#F43F5E`, `#E11D48`, `#FDA4AF`, `amber-*`, `orange-*`, `rose-*`, `red-*`
- **Legacy Cool Navy Surfaces**: `#05070A`, `#090C12`, `#0D1117`, `#0D131D`, `#121821`, `#192230`, `#1B2540`, `#1E293B`, `#26324A`, `#334155`

---

## 6. Pages & Components Updated
- **All 20 pages updated**: `AgentsPage`, `AnalyticsPage`, `ApplicationsPage`, `AuditPage`, `DashboardPage`, `DockerMonitoringPage`, `FaultDetectionPage`, `IncidentsPage`, `LiveEventsPage`, `LoginPage`, `NotificationsPage`, `ProcessMonitoringPage`, `RecoveryHistoryPage`, `RecoveryManagementPage`, `RegisterPage`, `RootCauseAnalysisPage`, `ServersPage`, `SettingsPage`, `SystemMonitoringPage`, `UserManagementPage`.
- **All 18+ components updated**: `Sidebar`, `Navbar`, `NotificationCenter`, `AppLayout`, `AiIntelligencePanel`, `LiveActivityFeed`, `QuickActionsBar`, `SelfHealingLifecycle`, `SystemHealthBanner`, `Banners`, `Button`, `ConfirmDialog`, `DataTable`, `EmptyState`, `FormField`, `MetricBar`, `PageHeader`, `Pagination`, `RouteErrorBoundary`, `Skeleton`, `StatCard`, `StatusBadge`, `Toast`.

---

## 7. Verification Results
- **Frontend Unit Tests (`npm.cmd test`)**: **16/16 passed** across 5 test files (`Vitest`).
- **Frontend Production Build (`npm.cmd run build`)**: `tsc && vite build` succeeded (`✓ built in 6.82s`).
- **Backend Test Suite (`mvn test`)**: **29/29 passed** (`BUILD SUCCESS`).
- **Live Browser Verification (`http://localhost:5173`)**:
  - Inspected `/`, `/monitoring/system`, `/servers`, `/detection`, `/incidents`, `/recovery`, `/analytics`, `/audit`, `/settings`, `/users`, Notification Center (`Escape` key dismissal), and mobile viewport (`390x844`).
  - **0 console errors**, **0 failed HTTP requests (4xx/5xx)**, **0 horizontal overflow** on desktop (`1440x900`) and mobile (`390x844`).
  - **Remaining notes**: A few `placeholder-slate-600` utility strings remain in search inputs on `ServersPage`, `AuditPage`, and `UserManagementPage`; all visible surfaces, borders, text, charts, and accents follow the official SHARP palette.
