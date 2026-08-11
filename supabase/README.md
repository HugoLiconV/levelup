# LevelUp notifications setup

Phase 3 keeps progress and health data in browser `localStorage`. Supabase stores only anonymous device push subscriptions, reminder preferences, active movement timers, and delivery idempotency keys.

## Local setup

1. Copy `.env.example` to `.env.local` and fill in the Supabase and VAPID values.
2. Link the CLI to the Supabase project: `supabase link --project-ref <project-ref>`.
3. Apply the migration: `supabase db push`.
4. Deploy the scheduler: `supabase functions deploy notifications-scheduler`.
5. Set the Edge Function secrets:

   ```bash
   supabase secrets set LEVELUP_APP_URL=https://your-deployed-app.example
   supabase secrets set NOTIFICATION_CRON_SECRET=your-shared-secret
   ```

6. Store `project_url`, `function_key`, and `scheduler_secret` in Supabase Vault, using the same scheduler secret as the app.
7. Run the commented `cron.schedule` statement at the end of the notification migration to invoke the function every minute.

The app needs to be served over HTTPS for production push subscriptions. iOS push also requires the site to be installed as a Home Screen web app.

## Manual smoke test

1. Open the deployed app on a supported browser or installed iPhone Home Screen app.
2. In Más, enable Recordatorios and accept the browser prompt.
3. Confirm a row appears in `notification_devices` without any LevelUp progress fields.
4. Set the Omega-3 time to the next minute and confirm one push arrives.
5. Start the 45-minute timer, close the app, and invoke the scheduler after the due time for a push smoke test.
6. Click each notification and confirm it opens `/?screen=today` or `/?screen=move`.
7. Revoke permission, unsubscribe, and verify the settings state and server row are cleaned up.
