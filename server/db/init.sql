-- Users
create table if not exists users (
  id bigserial primary key,
  username text not null unique,
  password_hash text not null,
  role text not null default 'user',
  created_at timestamptz not null default now()
);

-- Plans
create table if not exists plans (
  id bigserial primary key,
  user_id bigint not null references users(id) on delete cascade,
  date text not null,
  title text not null,
  category text not null,
  minutes int not null,
  done boolean not null default false,
  notes text,
  public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_plans_user_date on plans(user_id, date);
create index if not exists idx_plans_public_date on plans(public, date);

-- Resources
create table if not exists resources (
  id bigserial primary key,
  title text not null,
  category text not null,
  type text not null,
  url text not null,
  summary text not null,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_resources_updated_at on resources(updated_at);

-- seed admin account
insert into users(username, password_hash, role)
values (
  'admin',
  '$2a$10$BQlJpA08SWShMb.tcaxotuioe1dkYvUbbc2lOW2F.k0WMgUt0eXB2',
  'admin'
)


on conflict (username) do nothing;

-- password hash above corresponds to default password: spw-admin
