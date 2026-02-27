Important Files Changed
Filename	Overview
supabase/migrations/20260224100001_add_anniversary_reminder_fields.sql	Adds reminder configuration columns (offsets, time, timezone) with proper defaults and index for cron queries
src/lib/date-utils.ts	Introduces parseLocalYmd and formatLocalYmd utilities to handle date-only strings safely without timezone drift
src/lib/validations/anniversary.ts	Updates Zod schemas to require lunar_year for both yearly and once recurrence, enforcing proper lunar calendar validation
src/app/api/cron/anniversary-reminders/route.ts	New cron endpoint for anniversary reminders with CRON_SECRET auth, event_key deduplication, and proper lunar/solar occurrence calculation
src/services/notifications.ts	New notification service with event_key deduplication support for preventing duplicate reminder notifications
src/services/actions/new-anniversary.action.ts	Updated to always store lunar_year (not just for once recurrence) and properly handle direct lunar input in create/update flows
src/components/profile/AnniversaryForm.tsx	Enhanced to support direct lunar calendar input with solar preview, updated validation to match new schema requirements
%%{init: {'theme': 'neutral'}}%%
flowchart TD
    A[User creates anniversary] --> B{Calendar type?}
    B -->|Solar| C[Select solar date]
    B -->|Lunar| D[Input day/month/year]
    D --> E[Real-time solar preview]
    C --> F[Store in DB]
    E --> F
    
    F --> G[Database: anniversaries table]
    G --> H[reminder_offsets_days array]
    G --> I[reminder_time_local]
    G --> J[reminder_timezone]
    
    K[Cron Job - Daily] --> L{Verify CRON_SECRET}
    L -->|Valid| M[createAdminClient]
    L -->|Invalid| N[401 Unauthorized]
    
    M --> O[Query anniversaries with reminders]
    O --> P[Calculate occurrence dates]
    P --> Q{For each offset}
    
    Q --> R[Check if today + offset = occurrence]
    R -->|Yes| S[Generate event_key]
    S --> T[sendNotification with dedupe]
    T --> U{Already sent?}
    U -->|Yes| V[Skip]
    U -->|No| W[Insert notification]
    
    X[Calendar API] --> Y[parseLocalYmd for dates]
    Y --> Z[Avoid timezone drift]
    Z --> AA[Expand yearly occurrences]
    AA --> AB[Return calendar events]
