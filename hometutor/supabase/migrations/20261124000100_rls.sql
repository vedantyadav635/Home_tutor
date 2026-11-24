-- Row level security, guard triggers and grants.

-- Helpers ----------------------------------------------------------------------
create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
$$;

-- Admin, service_role, or no JWT at all (migrations, SQL editor, seed).
-- "No JWT" only counts outside the API: PostgREST always connects as `authenticator`.
-- Safe inside SECURITY DEFINER functions: it never looks at current_user.
create function public.is_privileged() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_admin()
      or coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '') = 'service_role'
      or (nullif(current_setting('request.jwt.claims', true), '') is null and session_user <> 'authenticator')
$$;

-- Table privileges: Supabase grants ALL to anon/authenticated by default. Start from nothing.
revoke all on all tables in schema public from anon, authenticated;

alter table public.profiles         enable row level security;
alter table public.tutors           enable row level security;
alter table public.tutor_experience enable row level security;
alter table public.tutor_education  enable row level security;
alter table public.demo_requests    enable row level security;
alter table public.contact_messages enable row level security;

-- profiles ---------------------------------------------------------------------
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()))
  with check (id = (select auth.uid()) or (select public.is_admin()));

grant select on public.profiles to authenticated;
grant update (role, full_name, phone) on public.profiles to authenticated;

create function public.profiles_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.role is distinct from old.role and not public.is_privileged() then
    raise exception 'only an admin can change a role' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger profiles_guard before update on public.profiles
  for each row execute function public.profiles_guard();

-- tutors -------------------------------------------------------------------------
create policy tutors_select on public.tutors for select to anon, authenticated
  using (status = 'approved' or id = (select auth.uid()) or (select public.is_admin()));
create policy tutors_insert on public.tutors for insert to authenticated
  with check (
    id = (select auth.uid())
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'tutor')
  );
create policy tutors_update on public.tutors for update to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()))
  with check (id = (select auth.uid()) or (select public.is_admin()));
create policy tutors_delete on public.tutors for delete to authenticated
  using (id = (select auth.uid()));

grant select on public.tutors to anon, authenticated;
grant insert, update, delete on public.tutors to authenticated;

create function public.tutors_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  priv boolean := public.is_privileged();
begin
  if tg_op = 'INSERT' then
    if not priv then
      new.status := 'draft';
      new.verified := false;
      new.featured := false;
      new.review_note := null;
      new.submitted_at := null;
      new.approved_at := null;
    elsif new.status = 'approved' and new.approved_at is null then
      new.approved_at := now();
    end if;
    return new;
  end if;

  -- UPDATE
  if not priv then
    if new.verified    is distinct from old.verified
    or new.featured    is distinct from old.featured
    or new.review_note is distinct from old.review_note
    or new.approved_at is distinct from old.approved_at then
      raise exception 'verified, featured, review_note and approved_at are admin-only' using errcode = '42501';
    end if;
    new.submitted_at := old.submitted_at;
    if new.status is distinct from old.status then
      if new.status = 'pending' and old.status in ('draft', 'rejected') then
        new.submitted_at := now();
      elsif new.status <> 'draft' then
        raise exception 'status change % -> % is not allowed', old.status, new.status using errcode = '42501';
      end if;
    end if;
  else
    if new.status = 'pending' and old.status is distinct from 'pending' then
      new.submitted_at := now();
    elsif new.status = 'approved' and old.status is distinct from 'approved' then
      new.approved_at := now();
    end if;
  end if;
  return new;
end $$;
create trigger tutors_guard before insert or update on public.tutors
  for each row execute function public.tutors_guard();

-- tutor_experience / tutor_education ---------------------------------------------------
-- Visible when the parent tutor row is visible; writable by the tutor who owns it.
create policy tutor_experience_select on public.tutor_experience for select to anon, authenticated
  using (exists (select 1 from public.tutors t where t.id = tutor_id
                 and (t.status = 'approved' or t.id = (select auth.uid()) or (select public.is_admin()))));
create policy tutor_experience_write on public.tutor_experience for all to authenticated
  using (tutor_id = (select auth.uid())) with check (tutor_id = (select auth.uid()));

create policy tutor_education_select on public.tutor_education for select to anon, authenticated
  using (exists (select 1 from public.tutors t where t.id = tutor_id
                 and (t.status = 'approved' or t.id = (select auth.uid()) or (select public.is_admin()))));
create policy tutor_education_write on public.tutor_education for all to authenticated
  using (tutor_id = (select auth.uid())) with check (tutor_id = (select auth.uid()));

grant select on public.tutor_experience, public.tutor_education to anon, authenticated;
grant insert, update, delete on public.tutor_experience, public.tutor_education to authenticated;

-- demo_requests ------------------------------------------------------------------------
create policy demo_requests_insert on public.demo_requests for insert to anon, authenticated
  with check (true);  -- validated and normalised by demo_requests_before_insert
create policy demo_requests_select on public.demo_requests for select to authenticated
  using (tutor_id = (select auth.uid()) or parent_id = (select auth.uid()) or (select public.is_admin()));
create policy demo_requests_update on public.demo_requests for update to authenticated
  using (tutor_id = (select auth.uid())) with check (tutor_id = (select auth.uid()));

grant insert on public.demo_requests to anon, authenticated;
grant select on public.demo_requests to authenticated;
grant update (status, tutor_note) on public.demo_requests to authenticated;

-- Phone numbers are matched on their last 10 digits so "+91..." and "..." count as one.
create index demo_requests_phone on public.demo_requests (right(parent_phone, 10), created_at desc);

-- SECURITY DEFINER so the spam checks can see every row. Privilege comes from is_privileged(), never current_user.
create function public.demo_requests_before_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  t     public.tutors;
  phone text := right(new.parent_phone, 10);
begin
  if not public.is_privileged() then
    new.parent_id  := auth.uid();
    new.status     := 'new';
    new.tutor_note := null;
    new.created_at := now();
    new.updated_at := now();
  end if;

  select * into t from public.tutors where id = new.tutor_id;
  if not found or t.status <> 'approved' then
    raise exception 'this tutor is not available' using errcode = '23514';
  end if;
  if not coalesce(new.subject = any (t.subjects) and new.class_band = any (t.class_bands) and new.mode = any (t.modes), false) then
    raise exception 'this tutor does not offer that subject, class or mode' using errcode = '23514';
  end if;

  -- Serialise inserts per phone so two parallel requests can't both pass the count.
  perform pg_advisory_xact_lock(hashtext('demo_requests:' || phone));
  if (select count(*) from public.demo_requests
      where right(parent_phone, 10) = phone and created_at > now() - interval '24 hours') >= 5 then
    raise exception 'too many requests from this phone number today' using errcode = '23514';
  end if;
  if exists (select 1 from public.demo_requests
             where tutor_id = new.tutor_id and right(parent_phone, 10) = phone and status in ('new', 'contacted')) then
    raise exception 'you already have an open request with this tutor' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger demo_requests_before_insert before insert on public.demo_requests
  for each row execute function public.demo_requests_before_insert();

create function public.demo_requests_before_update() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_privileged()
     and (to_jsonb(new) - '{status,tutor_note,updated_at}'::text[])
         is distinct from (to_jsonb(old) - '{status,tutor_note,updated_at}'::text[]) then
    raise exception 'only status and tutor_note can be changed' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger demo_requests_before_update before update on public.demo_requests
  for each row execute function public.demo_requests_before_update();

-- contact_messages ---------------------------------------------------------------------
create policy contact_messages_insert on public.contact_messages for insert to anon, authenticated
  with check (handled = false);
create policy contact_messages_select on public.contact_messages for select to authenticated
  using ((select public.is_admin()));
create policy contact_messages_update on public.contact_messages for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

grant insert on public.contact_messages to anon, authenticated;
grant select, update (handled) on public.contact_messages to authenticated;

-- Tutor phone, revealed to the parent only after the tutor accepts -----------------
create function public.tutor_contact_for_request(request_id uuid) returns text
language sql stable security definer set search_path = '' as $$
  select p.phone
  from public.demo_requests r
  join public.profiles p on p.id = r.tutor_id
  where r.id = request_id
    and r.status = 'accepted'
    and (r.parent_id = auth.uid() or public.is_admin())
$$;

-- Function privileges -------------------------------------------------------------------
revoke execute on function
  public.tutor_contact_for_request(uuid),
  public.handle_new_user(), public.profiles_guard(), public.tutors_guard(),
  public.demo_requests_before_insert(), public.demo_requests_before_update()
from public, anon, authenticated;
grant execute on function public.tutor_contact_for_request(uuid) to authenticated;
grant execute on function public.is_admin(), public.is_privileged() to anon, authenticated;
