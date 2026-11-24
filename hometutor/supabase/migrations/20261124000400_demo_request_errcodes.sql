-- Give each demo-request rule its own SQLSTATE so the API can map it (src/lib/api.ts PG_ERRORS):
--   tutor missing / not approved -> P0002 (404)   not offered          -> 22023 (400)
--   too many from this phone     -> 53400 (429)   open request exists  -> 23505 (409)
-- Logic and messages are unchanged from 20261124000100_rls.sql.
create or replace function public.demo_requests_before_insert() returns trigger
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
    raise exception 'this tutor is not available' using errcode = 'P0002';
  end if;
  if not coalesce(new.subject = any (t.subjects) and new.class_band = any (t.class_bands) and new.mode = any (t.modes), false) then
    raise exception 'this tutor does not offer that subject, class or mode' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtext('demo_requests:' || phone));
  if (select count(*) from public.demo_requests
      where right(parent_phone, 10) = phone and created_at > now() - interval '24 hours') >= 5 then
    raise exception 'too many requests from this phone number today' using errcode = '53400';
  end if;
  if exists (select 1 from public.demo_requests
             where tutor_id = new.tutor_id and right(parent_phone, 10) = phone and status in ('new', 'contacted')) then
    raise exception 'you already have an open request with this tutor' using errcode = '23505';
  end if;
  return new;
end $$;

revoke execute on function public.demo_requests_before_insert() from public, anon, authenticated;
