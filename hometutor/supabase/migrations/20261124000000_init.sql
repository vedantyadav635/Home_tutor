-- HomeTutor data model.
-- Allowed values mirror src/lib/options.ts; keep both in sync.

create extension if not exists pg_trgm with schema extensions;

-- Enums ---------------------------------------------------------------------
create type public.user_role      as enum ('parent', 'tutor', 'admin');
create type public.tutor_status   as enum ('draft', 'pending', 'approved', 'rejected');
create type public.request_status as enum ('new', 'contacted', 'accepted', 'declined', 'closed');

-- Allowed-value helpers (immutable so they can be used in CHECK constraints) --
create function public.opt_boards()      returns text[] language sql immutable as $$ select array['CBSE','State Board','ICSE','Competitive Exams'] $$;
create function public.opt_class_bands() returns text[] language sql immutable as $$ select array['1-8','9-10','11-12','exam'] $$;
create function public.opt_subjects()    returns text[] language sql immutable as $$ select array['Maths','Science','Physics','Chemistry','Biology','English','Hindi','Geography','History','GK','Accounts','Economics','Computer Science'] $$;
create function public.opt_modes()       returns text[] language sql immutable as $$ select array['Home Visit','Online','Hybrid'] $$;
create function public.opt_languages()   returns text[] language sql immutable as $$ select array['Hindi','English','Bilingual'] $$;
create function public.opt_availability() returns text[] language sql immutable as $$
  select array_agg(d || ':' || s)
  from unnest(array['Mon','Tue','Wed','Thu','Fri','Sat','Sun']) d,
       unnest(array['morning','afternoon','evening']) s
$$;

create function public.set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- profiles ------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  role        public.user_role not null default 'parent',
  full_name   text,
  phone       text check (phone ~ '^\+?[0-9]{10,13}$'),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- tutors --------------------------------------------------------------------
create table public.tutors (
  id                uuid primary key references public.profiles (id) on delete cascade,
  slug              text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  full_name         text not null,
  qualification     text,
  years_experience  int  check (years_experience between 0 and 60),
  city              text,
  area              text,
  travel_range      text,
  bio               text check (char_length(bio) <= 300),
  methodology       text check (char_length(methodology) <= 2000),
  fee_text          text,
  fee_amount        int  check (fee_amount >= 0),
  fee_unit          text check (fee_unit in ('hour', 'month')),
  subjects          text[] not null default '{}' check (subjects     <@ public.opt_subjects()),
  class_bands       text[] not null default '{}' check (class_bands  <@ public.opt_class_bands()),
  boards            text[] not null default '{}' check (boards       <@ public.opt_boards()),
  modes             text[] not null default '{}' check (modes        <@ public.opt_modes()),
  languages         text[] not null default '{}' check (languages    <@ public.opt_languages()),
  availability      text[] not null default '{}' check (availability <@ public.opt_availability()),
  photo_path        text,
  status            public.tutor_status not null default 'draft',
  verified          boolean not null default false,
  featured          boolean not null default false,
  review_note       text,
  submitted_at      timestamptz,
  approved_at       timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  location_search   text generated always as (
    lower(coalesce(area, '') || ' ' || coalesce(city, '') || ' ' || coalesce(travel_range, ''))
  ) stored
);

create index tutors_subjects_gin     on public.tutors using gin (subjects);
create index tutors_class_bands_gin  on public.tutors using gin (class_bands);
create index tutors_boards_gin       on public.tutors using gin (boards);
create index tutors_modes_gin        on public.tutors using gin (modes);
create index tutors_languages_gin    on public.tutors using gin (languages);
create index tutors_availability_gin on public.tutors using gin (availability);
create index tutors_location_trgm    on public.tutors using gin (location_search extensions.gin_trgm_ops);

-- tutor_experience / tutor_education ----------------------------------------
create table public.tutor_experience (
  id          uuid primary key default gen_random_uuid(),
  tutor_id    uuid not null references public.tutors (id) on delete cascade,
  period      text,
  title       text not null,
  details     text,
  sort_order  int not null default 0
);
create index tutor_experience_tutor on public.tutor_experience (tutor_id, sort_order);

create table public.tutor_education (
  id          uuid primary key default gen_random_uuid(),
  tutor_id    uuid not null references public.tutors (id) on delete cascade,
  item        text not null,
  sort_order  int not null default 0
);
create index tutor_education_tutor on public.tutor_education (tutor_id, sort_order);

-- demo_requests -------------------------------------------------------------
create table public.demo_requests (
  id            uuid primary key default gen_random_uuid(),
  tutor_id      uuid not null references public.tutors (id) on delete cascade,
  parent_id     uuid references public.profiles (id) on delete set null,
  parent_name   text not null,
  parent_phone  text not null check (parent_phone ~ '^\+?[0-9]{10,13}$'),
  class_band    text check (class_band = any (public.opt_class_bands())),
  subject       text check (subject    = any (public.opt_subjects())),
  mode          text check (mode       = any (public.opt_modes())),
  message       text check (char_length(message) <= 1000),
  status        public.request_status not null default 'new',
  tutor_note    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index demo_requests_tutor  on public.demo_requests (tutor_id, created_at desc);
create index demo_requests_parent on public.demo_requests (parent_id, created_at desc);

-- contact_messages ----------------------------------------------------------
create table public.contact_messages (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  reach        text not null,
  sender_type  text not null check (sender_type in ('Parent', 'Tutor', 'Other')),
  message      text not null check (char_length(message) <= 2000),
  handled      boolean not null default false,
  created_at   timestamptz not null default now()
);

-- updated_at triggers -------------------------------------------------------
create trigger profiles_updated_at      before update on public.profiles      for each row execute function public.set_updated_at();
create trigger tutors_updated_at        before update on public.tutors        for each row execute function public.set_updated_at();
create trigger demo_requests_updated_at before update on public.demo_requests for each row execute function public.set_updated_at();

-- RLS: on for every table, no policies yet (deny all except service role).
-- Policies come in a later step.
alter table public.profiles         enable row level security;
alter table public.tutors           enable row level security;
alter table public.tutor_experience enable row level security;
alter table public.tutor_education  enable row level security;
alter table public.demo_requests    enable row level security;
alter table public.contact_messages enable row level security;

-- Profile on sign-up ---------------------------------------------------------
-- Role comes from user metadata but can only be parent or tutor; admin is never self-assigned.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  meta  jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  ph    text  := nullif(trim(meta ->> 'phone'), '');
begin
  insert into public.profiles (id, role, full_name, phone)
  values (
    new.id,
    case when meta ->> 'role' in ('parent', 'tutor')
         then (meta ->> 'role')::public.user_role
         else 'parent'::public.user_role end,
    nullif(trim(meta ->> 'full_name'), ''),
    case when ph ~ '^\+?[0-9]{10,13}$' then ph end  -- bad phone is dropped, not a failed sign-up
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
