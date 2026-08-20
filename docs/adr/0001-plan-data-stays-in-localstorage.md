# Nutrition Plan data stays in localStorage, not Supabase

A Supabase auth migration is already in flight (uncommitted `middleware.ts`, `app/login/`, `app/lib/supabase/`), which could have made Supabase the obvious place to store the new versioned Plan/Shopping List/Supplement data. We chose to extend the existing localStorage `AppState` instead, because the feature is scoped to single-device use for now — "having it on my phone" meant replacing a paper printout, not syncing across devices. Revisit if/when the Supabase migration is finished and multi-device access becomes a real requirement.
