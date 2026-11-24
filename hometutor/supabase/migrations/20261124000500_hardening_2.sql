-- Backend audit fixes.

-- 1. review_note was readable by anyone through the REST API (table-level SELECT).
--    Grant SELECT on every column except review_note; owners and admins read it via tutor_review_notes().
revoke select on public.tutors from anon, authenticated;
grant select (
  id, slug, full_name, qualification, years_experience, city, area, travel_range, bio, methodology,
  fee_text, fee_amount, fee_unit, subjects, class_bands, boards, modes, languages, availability,
  photo_path, status, verified, featured, submitted_at, approved_at, created_at, updated_at, location_search
) on public.tutors to anon, authenticated;

create function public.tutor_review_notes(p_ids uuid[]) returns table (id uuid, review_note text)
language sql stable security definer set search_path = '' as $$
  select t.id, t.review_note
  from public.tutors t
  where t.id = any (p_ids) and (t.id = auth.uid() or public.is_admin())
$$;
revoke execute on function public.tutor_review_notes(uuid[]) from public, anon;
grant execute on function public.tutor_review_notes(uuid[]) to authenticated;

-- 2. Contact form: at most 5 messages per phone/email per 24 hours (same pattern as demo requests).
create index contact_messages_reach on public.contact_messages (lower(reach), created_at desc);

create function public.contact_messages_before_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_privileged() then
    new.handled := false;
    new.created_at := now();
  end if;
  if (select count(*) from public.contact_messages
      where lower(reach) = lower(new.reach) and created_at > now() - interval '24 hours') >= 5 then
    raise exception 'too many messages from this contact today' using errcode = '53400';
  end if;
  return new;
end $$;
revoke execute on function public.contact_messages_before_insert() from public, anon, authenticated;
create trigger contact_messages_before_insert before insert on public.contact_messages
  for each row execute function public.contact_messages_before_insert();

-- 3. One permissive policy per action (advisor: multiple_permissive_policies). Same rules as before.
drop policy tutor_experience_write on public.tutor_experience;
create policy tutor_experience_insert on public.tutor_experience for insert to authenticated
  with check (tutor_id = (select auth.uid()));
create policy tutor_experience_update on public.tutor_experience for update to authenticated
  using (tutor_id = (select auth.uid())) with check (tutor_id = (select auth.uid()));
create policy tutor_experience_delete on public.tutor_experience for delete to authenticated
  using (tutor_id = (select auth.uid()));

drop policy tutor_education_write on public.tutor_education;
create policy tutor_education_insert on public.tutor_education for insert to authenticated
  with check (tutor_id = (select auth.uid()));
create policy tutor_education_update on public.tutor_education for update to authenticated
  using (tutor_id = (select auth.uid())) with check (tutor_id = (select auth.uid()));
create policy tutor_education_delete on public.tutor_education for delete to authenticated
  using (tutor_id = (select auth.uid()));
