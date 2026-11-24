-- Audit fixes: review_note privacy, contact rate limit, split experience/education policies.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(12);

-- Fixtures (privileged): tutor A with a review note, tutor B, an admin.
set local request.jwt.claims to '';
insert into auth.users (id, email, raw_user_meta_data) values
  ('d0000000-0000-4000-8000-000000000001', 'ha@test.local', '{"role":"tutor"}'),
  ('d0000000-0000-4000-8000-000000000002', 'hb@test.local', '{"role":"tutor"}'),
  ('d0000000-0000-4000-8000-000000000003', 'hadmin@test.local', '{}');
update profiles set role = 'admin' where id = 'd0000000-0000-4000-8000-000000000003';
insert into tutors (id, slug, full_name, status, review_note) values
  ('d0000000-0000-4000-8000-000000000001', 'hard-a', 'Hard A', 'approved', 'Please add a clearer photo'),
  ('d0000000-0000-4000-8000-000000000002', 'hard-b', 'Hard B', 'approved', null);

-- review_note privacy
set local role anon;
set local request.jwt.claims to '{"role":"anon"}';
select throws_ok($$select review_note from tutors where slug = 'hard-a'$$, '42501', null, 'anon cannot select review_note');
select isnt_empty($$select slug, status, verified from tutors where slug = 'hard-a'$$, 'anon can still select public columns');
select throws_ok($$select * from tutor_review_notes(array['d0000000-0000-4000-8000-000000000001'::uuid])$$, '42501', null,
  'anon cannot call tutor_review_notes');

set local role authenticated;
set local request.jwt.claims to '{"sub":"d0000000-0000-4000-8000-000000000002","role":"authenticated"}';
select throws_ok($$select review_note from tutors where slug = 'hard-a'$$, '42501', null, 'another tutor cannot select review_note');
select is_empty($$select * from tutor_review_notes(array['d0000000-0000-4000-8000-000000000001'::uuid])$$,
  'another tutor gets no review notes from the function');

set local request.jwt.claims to '{"sub":"d0000000-0000-4000-8000-000000000001","role":"authenticated"}';
select is((select review_note from tutor_review_notes(array['d0000000-0000-4000-8000-000000000001'::uuid])),
  'Please add a clearer photo', 'the owner reads their own review note');
select lives_ok($$update tutors set bio = 'still editable' where id = 'd0000000-0000-4000-8000-000000000001'$$,
  'the owner can still update their profile');

set local request.jwt.claims to '{"sub":"d0000000-0000-4000-8000-000000000003","role":"authenticated"}';
select is((select count(*)::int from tutor_review_notes(array['d0000000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000002']::uuid[])),
  2, 'admin reads review notes for any tutor');
select lives_ok($$update tutors set review_note = 'Looks good' where id = 'd0000000-0000-4000-8000-000000000002'$$,
  'admin can still write review_note');

-- Split experience policies keep the same rules
set local request.jwt.claims to '{"sub":"d0000000-0000-4000-8000-000000000002","role":"authenticated"}';
select throws_ok($$insert into tutor_experience (tutor_id, title) values ('d0000000-0000-4000-8000-000000000001', 'fake')$$,
  '42501', null, 'a tutor still cannot add experience to another profile');

-- Contact rate limit: 5 per reach per day (case-insensitive), the 6th fails
set local role anon;
set local request.jwt.claims to '{"role":"anon"}';
insert into contact_messages (name, reach, sender_type, message)
select 'Hard Spam', r, 'Other', 'hello' from unnest(array['spam@x.com','SPAM@x.com','spam@x.com','spam@x.com','spam@x.com']) r;
select throws_like($$insert into contact_messages (name, reach, sender_type, message) values ('Hard Spam', 'spam@x.com', 'Other', 'hello')$$,
  '%too many messages%', 'the 6th contact message from one reach in a day is rejected');
select lives_ok($$insert into contact_messages (name, reach, sender_type, message) values ('Hard Other', 'other@x.com', 'Other', 'hello')$$,
  'a different reach is not affected');

select * from finish();
rollback;
