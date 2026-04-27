create type visitor_status as enum ('booked', 'checked-in', 'checked-out');
create type visit_language as enum ('sv', 'en');
create type log_action as enum ('registered', 'check-in', 'check-out');
create type notification_status as enum ('not-configured', 'pending', 'sent', 'failed', 'skipped');
create type notification_channel as enum ('email');

create table hosts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index hosts_name_lower_unique on hosts (lower(name));

create table saved_visitors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index saved_visitors_name_lower_unique on saved_visitors (lower(name));

create table visits (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text not null,
  host text not null,
  host_email text,
  phone text,
  pre_booked boolean not null default true,
  status visitor_status not null default 'booked',
  expected_arrival timestamptz,
  check_in_time timestamptz,
  check_out_time timestamptz,
  language visit_language not null default 'sv',
  notification_status notification_status,
  notification_channel notification_channel,
  notification_attempted_at timestamptz,
  notification_sent_at timestamptz,
  notification_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table visit_logs (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid references visits(id) on delete cascade,
  visitor_name text not null,
  company text not null,
  host text not null,
  action log_action not null,
  notification_status notification_status,
  notification_recipient text,
  created_at timestamptz not null default now()
);

alter table hosts enable row level security;
alter table saved_visitors enable row level security;
alter table visits enable row level security;
alter table visit_logs enable row level security;

grant usage on schema public to service_role;

grant select, insert, update, delete on table public.hosts to service_role;
grant select, insert, update, delete on table public.saved_visitors to service_role;
grant select, insert, update, delete on table public.visits to service_role;
grant select, insert, update, delete on table public.visit_logs to service_role;
