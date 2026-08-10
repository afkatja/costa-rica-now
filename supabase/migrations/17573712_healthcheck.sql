create table if not exists public.healthcheck (
  id integer primary key,
  note text,
  updated_at timestamptz not null default now()
);

alter table public.healthcheck enable row level security;

drop policy if exists "allow anon read healthcheck" on public.healthcheck;

create policy "allow anon read healthcheck"
  on public.healthcheck
  for select
  to anon
  using (true);

insert into public.healthcheck (id, note)
values (1, 'keepalive')
on conflict (id) do nothing;