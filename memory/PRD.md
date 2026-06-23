# TASKEZY CRM Admin – PRD

A premium mobile-first enterprise CRM Admin app built with Expo React Native + FastAPI + MongoDB.

## What's built

### Backend (`/app/backend/server.py`)
- **Auth** – JWT (HS256) email/password login with bcrypt hashing. Seeds a single admin (`admin@taskezy.com / Admin@12345`) on startup.
- **CRM data model & seed** – 8 agents, 12 properties, 120 leads, recent activities, 6 marketing campaigns; uses Indian names/cities and real estate verticals.
- **REST API (all routes prefixed with `/api`):**
  - `POST /auth/login`, `GET /auth/me`
  - `GET /dashboard/{summary,top-properties,top-agents,activities,followups,insights}`
  - `GET /leads`, `GET /leads/pipeline`, `GET /leads/{id}`, `POST /leads`, `PATCH /leads/{id}`
  - `GET /properties`, `GET /properties/{id}`
  - `GET /analytics/overview`, `GET /analytics/campaigns`
  - `GET /agents`

### Frontend (`/app/frontend/app`)
- **Routes**: `/login`, `/(tabs)/{dashboard,leads,properties,analytics,more}`, `/lead/[id]`, `/property/[id]`
- **Design system** – Premium Navy `#0B1B3D` + Royal Blue `#1D4ED8` + Light Blue `#EFF6FF` palette; consistent cards, shadows, chip rows, typography.
- **Dashboard** – Navy hero, Executive Attention Center, 6 KPI tiles, Sales Funnel, Lead Source donut, Marketing Performance bar chart, Top Properties, Top Agents, Follow-up Center, Recent Activities, AI Insights.
- **Leads** – Search + sticky horizontal status chip row, filter bottom sheet (source + hot toggle), list view with call/WhatsApp actions and hot flame indicator, pipeline kanban view (6 stages).
- **Lead detail** – Hero, status & assignee changeable via bottom-sheet pickers (calls `PATCH /leads/{id}`), contact details, timeline of activities.
- **Properties** – Search + city/BHK chip rows, rich cards with image, price, BHK pills, nested metrics strip.
- **Property detail** – Hero image, performance KPIs (Leads/Visits/Bookings/Conversion), conversion bar chart, amenities, recent leads.
- **Analytics** – 7D/30D/90D range chips, 6 KPI tiles (CPL, CTR, ROAS, Bookings, Spend, Revenue), Leads Trend + Bookings Trend line charts, Lead Source donut + stacked bar, Campaign performance list, Executive Summary card.
- **More** – Profile header, grouped settings rows (Personal / Management / Integrations / Settings & Support), logout.

### Auth
JWT stored in `expo-secure-store` via `@/src/utils/storage`. Token attached as `Authorization: Bearer` on every protected request.

### Charts
Custom SVG (`react-native-svg`) – Funnel, Donut, Bars, Line, Sparkline, StackedBar – no heavyweight chart library.

### Verified
25/25 backend pytest cases pass. All frontend flows (login → dashboard → tabs → details → logout) verified by `testing_agent`.
