-- Tutor search (mirrors the prototype's filtered()) and the tutor-photos bucket.

-- search_tutors ----------------------------------------------------------------------------
-- Within a group any value matches (&&); across groups all must match. Empty or null = no filter.
-- SECURITY INVOKER: RLS still applies; the explicit status filter keeps owners' drafts out too.
create function public.search_tutors(
  p_boards    text[] default null,
  p_bands     text[] default null,
  p_subjects  text[] default null,
  p_modes     text[] default null,
  p_languages text[] default null,
  p_min_years int    default 0,
  p_location  text   default null,
  p_limit     int    default 20,
  p_offset    int    default 0
)
returns table (
  id uuid, slug text, full_name text, qualification text, years_experience int,
  city text, area text, subjects text[], class_bands text[], modes text[], languages text[],
  bio text, fee_text text, photo_path text, verified boolean, total_count bigint
)
language sql stable security invoker set search_path = ''
as $$
  with loc as (
    -- Substring match on "area city travel_range", case-insensitive; % and _ in the input are literal.
    select replace(replace(replace(lower(trim(p_location)), '\', '\\'), '%', '\%'), '_', '\_') as q
  )
  select t.id, t.slug, t.full_name, t.qualification, t.years_experience,
         t.city, t.area, t.subjects, t.class_bands, t.modes, t.languages,
         t.bio, t.fee_text, t.photo_path, t.verified,
         count(*) over () as total_count
  from public.tutors t, loc
  where t.status = 'approved'
    and (coalesce(cardinality(p_boards), 0)    = 0 or t.boards      && p_boards)
    and (coalesce(cardinality(p_bands), 0)     = 0 or t.class_bands && p_bands)
    and (coalesce(cardinality(p_subjects), 0)  = 0 or t.subjects    && p_subjects)
    and (coalesce(cardinality(p_modes), 0)     = 0 or t.modes       && p_modes)
    and (coalesce(cardinality(p_languages), 0) = 0 or t.languages   && p_languages)
    and coalesce(t.years_experience, 0) >= coalesce(p_min_years, 0)
    and (coalesce(loc.q, '') = '' or t.location_search like '%' || loc.q || '%')
  order by t.verified desc, t.featured desc, t.years_experience desc nulls last, t.full_name
  limit greatest(1, least(coalesce(p_limit, 20), 50))
  offset greatest(coalesce(p_offset, 0), 0)
$$;

revoke execute on function public.search_tutors(text[], text[], text[], text[], text[], int, text, int, int) from public;
grant execute on function public.search_tutors(text[], text[], text[], text[], text[], int, text, int, int) to anon, authenticated;

-- tutor-photos bucket ------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tutor-photos', 'tutor-photos', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Anyone can read; a signed-in user can write only under "<their uid>/...".
create policy tutor_photos_read on storage.objects for select to anon, authenticated
  using (bucket_id = 'tutor-photos');
create policy tutor_photos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'tutor-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy tutor_photos_update on storage.objects for update to authenticated
  using      (bucket_id = 'tutor-photos' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'tutor-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy tutor_photos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'tutor-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
