create table if not exists public.prospecting_sessions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  status text not null default 'NOT_STARTED',
  opening_message text,
  messages jsonb not null default '[]'::jsonb,
  ui_state jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_prospecting_sessions_workspace on public.prospecting_sessions (workspace_id);
create index if not exists idx_prospecting_sessions_company on public.prospecting_sessions (company_id);

alter table public.prospecting_sessions enable row level security;

create or replace function public.current_workspace_id()
returns uuid language sql stable security definer as $$
  select workspace_id from public.app_users where id = auth.uid()
$$;

drop policy if exists "own prospecting_sessions" on public.prospecting_sessions;
create policy "own prospecting_sessions" on public.prospecting_sessions
  for all using (workspace_id = public.current_workspace_id());

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_prospecting_sessions_updated_at on public.prospecting_sessions;
create trigger trg_prospecting_sessions_updated_at before update on public.prospecting_sessions
  for each row execute function public.touch_updated_at();