-- Phase 3 notification state is intentionally separate from LevelUp's local
-- progress. The server stores only a device push subscription and reminder
-- metadata; habit and health data remain in browser localStorage.

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

create table if not exists public.notification_devices (
  id uuid primary key default gen_random_uuid(),
  device_token_hash text not null unique,
  endpoint text not null unique,
  subscription jsonb not null,
  reminder_enabled boolean not null default false,
  reminder_time time without time zone not null default '09:00',
  timezone text not null default 'UTC',
  timer_due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_devices_token_hash_length check (char_length(device_token_hash) = 64),
  constraint notification_devices_endpoint_https check (endpoint like 'https://%'),
  constraint notification_devices_timezone_length check (char_length(timezone) between 1 and 100)
);

create index if not exists notification_devices_timer_due_idx
  on public.notification_devices (timer_due_at)
  where timer_due_at is not null and reminder_enabled = true;

create index if not exists notification_devices_enabled_time_idx
  on public.notification_devices (reminder_enabled, reminder_time);

create table if not exists public.notification_deliveries (
  delivery_key text primary key,
  device_id uuid not null references public.notification_devices(id) on delete cascade,
  kind text not null,
  scheduled_for timestamptz not null,
  sent_at timestamptz not null default now()
);

create index if not exists notification_deliveries_device_idx
  on public.notification_deliveries (device_id, scheduled_for desc);

alter table public.notification_devices enable row level security;
alter table public.notification_deliveries enable row level security;

revoke all on table public.notification_devices from anon, authenticated;
revoke all on table public.notification_deliveries from anon, authenticated;

comment on table public.notification_devices is 'Anonymous device push subscriptions and reminder preferences. No LevelUp progress data.';
comment on table public.notification_deliveries is 'Idempotency keys for server-side notification delivery.';

-- Configure the hosted scheduler after storing these secrets in Supabase Vault:
--   project_url:     https://<project-ref>.supabase.co
--   function_key:    the function invocation key
--   scheduler_secret: same value as NOTIFICATION_CRON_SECRET
--
-- select cron.schedule(
--   'levelup-notification-scheduler',
--   '* * * * *',
--   $$
--   select net.http_post(
--     url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/notifications-scheduler',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'function_key'),
--       'x-levelup-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'scheduler_secret')
--     ),
--     body := jsonb_build_object('triggered_at', now())
--   );
--   $$
-- );
