-- search_tutors against the seeded tutors (supabase/seed.sql), plus tutor-photos storage policies.
-- Expected results come from running the prototype's filtered() on the same data.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(20);

set local role anon;
set local request.jwt.claims to '{"role":"anon"}';

-- Acceptance cases (prototype output, in search order: verified, featured, years desc, name)
select results_eq($$select full_name from search_tutors(p_subjects => '{Maths}')$$,
  $$values ('Priya Deshmukh'), ('Rahul Verma'), ('Amit Joshi'), ('Nikhil Gaikwad')$$,
  'subject Maths -> the 4 tutors the prototype returns');
select results_eq($$select full_name from search_tutors(p_modes => '{Online}', p_min_years => 5)$$,
  $$values ('Priya Deshmukh'), ('Kavita Iyer'), ('Rahul Verma')$$,
  'mode Online + 5 years -> Priya, Kavita, Rahul');
select results_eq($$select full_name from search_tutors(p_location => 'aundh')$$,
  $$values ('Sneha Kulkarni'), ('Rahul Verma'), ('Rohan Patil')$$,
  'location "aundh" matches area and travel range');
select results_eq($$select full_name from search_tutors(p_boards => '{ICSE}', p_bands => '{1-8}')$$,
  $$values ('Sneha Kulkarni'), ('Rohan Patil'), ('Nikhil Gaikwad')$$,
  'board ICSE + class 1-8 -> Sneha, Rohan, Nikhil');

-- Filter semantics
select results_eq($$select full_name from search_tutors(p_subjects => '{Accounts,Biology}')$$,
  $$values ('Kavita Iyer'), ('Fatima Shaikh')$$,
  'within a group any value matches');
select results_eq($$select full_name from search_tutors(p_subjects => '{Maths}', p_modes => '{"Home Visit"}')$$,
  $$values ('Priya Deshmukh'), ('Amit Joshi')$$,
  'across groups all must match');
select results_eq($$select full_name from search_tutors(p_languages => '{Hindi}', p_boards => '{"State Board"}')$$,
  $$values ('Fatima Shaikh'), ('Amit Joshi')$$,
  'language and board filters combine');
select is((select count(*)::int from search_tutors(p_limit => 50)), 8, 'no filters -> all 8 approved tutors');
select is((select count(*)::int from search_tutors('{}', '{}', '{}', '{}', '{}', 0, '', 50, 0)), 8,
  'empty arrays and empty location mean no filter');
select results_eq($$select full_name from search_tutors(p_location => '  KOTHRUD ')$$,
  $$values ('Priya Deshmukh')$$, 'location is trimmed and case-insensitive');
select is_empty($$select 1 from search_tutors(p_location => '%')$$, 'a % in the location is literal, not a wildcard');
select is_empty($$select 1 from search_tutors(p_min_years => 13)$$, 'min years filters out everyone below it');

-- Paging
select is((select count(*)::int from search_tutors(p_limit => 0)), 1, 'limit below 1 is clamped to 1');
select is((select total_count from search_tutors(p_subjects => '{Maths}', p_limit => 1)), 4::bigint,
  'total_count is the full match count, not the page size');
select results_eq($$select full_name from search_tutors(p_subjects => '{Maths}', p_limit => 1, p_offset => 2)$$,
  $$values ('Amit Joshi')$$, 'offset pages through results');

-- Only approved tutors, even for the owner
reset role;
set local request.jwt.claims to '';
update tutors set status = 'draft' where slug = 'priya-deshmukh';
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}';
select results_eq($$select full_name from search_tutors(p_subjects => '{Maths}')$$,
  $$values ('Rahul Verma'), ('Amit Joshi'), ('Nikhil Gaikwad')$$,
  'a draft tutor is not returned, not even to its owner');

-- Storage: tutor-photos (user 1 = Priya's seed account, user 2 = Rahul's)
select lives_ok($$insert into storage.objects (bucket_id, name) values ('tutor-photos', '00000000-0000-4000-8000-000000000001/avatar.jpg')$$,
  'a user can upload into their own folder');
select throws_ok($$insert into storage.objects (bucket_id, name) values ('tutor-photos', '00000000-0000-4000-8000-000000000002/x.jpg')$$,
  '42501', null, 'a user cannot upload into another user''s folder');

set local request.jwt.claims to '{"sub":"00000000-0000-4000-8000-000000000002","role":"authenticated"}';
-- (Direct DELETE on storage tables is blocked by Supabase itself; delete is checked via the Storage API.)
select is_empty($$update storage.objects set metadata = '{"hijacked":true}' where bucket_id = 'tutor-photos' and name = '00000000-0000-4000-8000-000000000001/avatar.jpg' returning id$$,
  'a user cannot overwrite another user''s photo');

set local role anon;
set local request.jwt.claims to '{"role":"anon"}';
select isnt_empty($$select 1 from storage.objects where bucket_id = 'tutor-photos'$$, 'anyone can read tutor photos');

select * from finish();
rollback;
