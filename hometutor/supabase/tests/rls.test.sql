-- RLS, guard triggers and grants. Run with: supabase test db
-- Actors: anon, parent P1, parent P2, tutor A, tutor B, tutor D (draft), admin.
-- Identity switches:
--   anon:      set local role anon;          set local request.jwt.claims to '{"role":"anon"}';
--   user:      set local role authenticated; set local request.jwt.claims to '{"sub":"<uuid>","role":"authenticated"}';
--   privileged (no JWT, like a migration): reset role; set local request.jwt.claims to '';
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(80);

-- Fixtures (privileged) ---------------------------------------------------------------------
set local request.jwt.claims to '';
insert into auth.users (id, email, raw_user_meta_data) values
  ('a0000000-0000-4000-8000-000000000001', 'p1@test.local', '{"role":"parent","full_name":"Parent One","phone":"9000000001"}'),
  ('a0000000-0000-4000-8000-000000000002', 'p2@test.local', '{"role":"parent","full_name":"Parent Two","phone":"9000000002"}'),
  ('a0000000-0000-4000-8000-000000000003', 'ta@test.local', '{"role":"tutor","full_name":"Tutor A","phone":"9800000001"}'),
  ('a0000000-0000-4000-8000-000000000004', 'tb@test.local', '{"role":"tutor","full_name":"Tutor B","phone":"9800000002"}'),
  ('a0000000-0000-4000-8000-000000000005', 'td@test.local', '{"role":"tutor","full_name":"Tutor D"}'),
  ('a0000000-0000-4000-8000-000000000006', 'ad@test.local', '{"role":"admin","full_name":"Admin"}');

-- 1-2 sign-up trigger
select is((select role::text from profiles where id = 'a0000000-0000-4000-8000-000000000006'), 'parent',
  'sign-up with role "admin" in metadata creates a parent');
select is((select role::text from profiles where id = 'a0000000-0000-4000-8000-000000000003'), 'tutor',
  'sign-up with role "tutor" creates a tutor');

update profiles set role = 'admin' where id = 'a0000000-0000-4000-8000-000000000006';
insert into tutors (id, slug, full_name, subjects, class_bands, modes, status) values
  ('a0000000-0000-4000-8000-000000000003', 'test-tutor-a', 'Tutor A', '{Maths}', '{9-10}', '{Online}', 'approved'),
  ('a0000000-0000-4000-8000-000000000004', 'test-tutor-b', 'Tutor B', '{Maths,English}', '{1-8,9-10}', '{Online,"Home Visit"}', 'approved');
insert into tutor_experience (tutor_id, title) values ('a0000000-0000-4000-8000-000000000003', 'A experience');

-- 3 privileged context
select ok(is_privileged(), 'no JWT outside the API (migration / SQL editor) is privileged');

-- Tutor D creates a profile -------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims to '{"sub":"a0000000-0000-4000-8000-000000000005","role":"authenticated"}';
select lives_ok($$insert into tutors (id, slug, full_name, subjects, class_bands, modes, status, verified, featured)
  values ('a0000000-0000-4000-8000-000000000005', 'test-tutor-d', 'Tutor D', '{Maths}', '{9-10}', '{Online}', 'approved', true, true)$$,
  'a tutor can create their own profile');
select results_eq($$select status::text, verified, featured from tutors where id = 'a0000000-0000-4000-8000-000000000005'$$,
  $$values ('draft'::text, false, false)$$,
  'insert by a tutor is forced to draft, unverified, not featured');
select lives_ok($$insert into tutor_experience (tutor_id, title) values ('a0000000-0000-4000-8000-000000000005', 'D experience')$$,
  'a tutor can add experience to their own profile');
select throws_ok($$insert into tutors (id, slug, full_name) values ('a0000000-0000-4000-8000-000000000002', 'test-steal', 'X')$$,
  '42501', null, 'a tutor cannot create a profile with someone else''s id');
select isnt_empty($$select 1 from tutors where id = 'a0000000-0000-4000-8000-000000000005'$$,
  'the owner can read their own draft');
select ok(not is_privileged(), 'a signed-in tutor is not privileged');

-- Parent cannot create a tutor profile
set local request.jwt.claims to '{"sub":"a0000000-0000-4000-8000-000000000001","role":"authenticated"}';
select throws_ok($$insert into tutors (id, slug, full_name) values ('a0000000-0000-4000-8000-000000000001', 'test-p1', 'P1')$$,
  '42501', null, 'a parent cannot create a tutor profile');

-- Anonymous visitor ---------------------------------------------------------------------------
set local role anon;
set local request.jwt.claims to '{"role":"anon"}';
select is_empty($$select 1 from tutors where id = 'a0000000-0000-4000-8000-000000000005'$$,
  'anon cannot see a draft tutor');
select isnt_empty($$select 1 from tutors where id = 'a0000000-0000-4000-8000-000000000003'$$,
  'anon can see an approved tutor');
select is_empty($$select 1 from tutor_experience where tutor_id = 'a0000000-0000-4000-8000-000000000005'$$,
  'anon cannot see a draft tutor''s experience');
select isnt_empty($$select 1 from tutor_experience where tutor_id = 'a0000000-0000-4000-8000-000000000003'$$,
  'anon can see an approved tutor''s experience');
select throws_ok($$insert into tutors (id, slug, full_name) values (gen_random_uuid(), 'test-anon', 'X')$$,
  '42501', null, 'anon cannot insert tutors');
select throws_ok($$select 1 from profiles$$, '42501', null, 'anon cannot read profiles');
select ok(not is_privileged(), 'anon is not privileged');

-- Draft visibility for others -----------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims to '{"sub":"a0000000-0000-4000-8000-000000000004","role":"authenticated"}';
select is_empty($$select 1 from tutors where id = 'a0000000-0000-4000-8000-000000000005'$$,
  'another tutor cannot see a draft tutor');
set local request.jwt.claims to '{"sub":"a0000000-0000-4000-8000-000000000006","role":"authenticated"}';
select isnt_empty($$select 1 from tutors where id = 'a0000000-0000-4000-8000-000000000005'$$,
  'admin can see a draft tutor');

-- Tutor A edits own profile -------------------------------------------------------------------
set local request.jwt.claims to '{"sub":"a0000000-0000-4000-8000-000000000003","role":"authenticated"}';
select isnt_empty($$update tutors set bio = 'Updated bio' where id = 'a0000000-0000-4000-8000-000000000003' returning id$$,
  'a tutor can update their own profile');
select throws_ok($$update tutors set verified = true where id = 'a0000000-0000-4000-8000-000000000003'$$,
  '42501', null, 'a tutor cannot set verified = true');
select throws_ok($$update tutors set featured = true where id = 'a0000000-0000-4000-8000-000000000003'$$,
  '42501', null, 'a tutor cannot set featured');
select throws_ok($$update tutors set review_note = 'looks great' where id = 'a0000000-0000-4000-8000-000000000003'$$,
  '42501', null, 'a tutor cannot set review_note');
select throws_ok($$update tutors set approved_at = '2020-01-01' where id = 'a0000000-0000-4000-8000-000000000003'$$,
  '42501', null, 'a tutor cannot set approved_at');

-- Tutor D status transitions
set local request.jwt.claims to '{"sub":"a0000000-0000-4000-8000-000000000005","role":"authenticated"}';
select throws_ok($$update tutors set status = 'approved' where id = 'a0000000-0000-4000-8000-000000000005'$$,
  '42501', null, 'a tutor cannot set status = approved');
select throws_ok($$update tutors set status = 'rejected' where id = 'a0000000-0000-4000-8000-000000000005'$$,
  '42501', null, 'a tutor cannot set status = rejected');
select lives_ok($$update tutors set status = 'pending' where id = 'a0000000-0000-4000-8000-000000000005'$$,
  'a tutor can submit: draft -> pending');
select ok((select submitted_at is not null from tutors where id = 'a0000000-0000-4000-8000-000000000005'),
  'submitting sets submitted_at');
select lives_ok($$update tutors set status = 'draft' where id = 'a0000000-0000-4000-8000-000000000005'$$,
  'a tutor can withdraw: pending -> draft');
select lives_ok($$update tutors set status = 'pending' where id = 'a0000000-0000-4000-8000-000000000005'$$,
  'a tutor can resubmit: draft -> pending');

-- Tutor B against tutor A's profile
set local request.jwt.claims to '{"sub":"a0000000-0000-4000-8000-000000000004","role":"authenticated"}';
select is_empty($$update tutors set bio = 'hacked' where id = 'a0000000-0000-4000-8000-000000000003' returning id$$,
  'a tutor cannot update another tutor''s profile');
select is_empty($$delete from tutors where id = 'a0000000-0000-4000-8000-000000000003' returning id$$,
  'a tutor cannot delete another tutor''s profile');
select throws_ok($$insert into tutor_experience (tutor_id, title) values ('a0000000-0000-4000-8000-000000000003', 'fake')$$,
  '42501', null, 'a tutor cannot add experience to another tutor''s profile');

-- Admin reviews tutor D
set local request.jwt.claims to '{"sub":"a0000000-0000-4000-8000-000000000006","role":"authenticated"}';
select ok(is_privileged(), 'admin is privileged');
select lives_ok($$update tutors set status = 'approved', verified = true where id = 'a0000000-0000-4000-8000-000000000005'$$,
  'admin can approve and verify a tutor');
select results_eq($$select status::text, verified, approved_at is not null from tutors where id = 'a0000000-0000-4000-8000-000000000005'$$,
  $$values ('approved'::text, true, true)$$,
  'approval sets approved_at');

-- Profiles ------------------------------------------------------------------------------------
set local request.jwt.claims to '{"sub":"a0000000-0000-4000-8000-000000000001","role":"authenticated"}';
select is((select count(*)::int from profiles), 1, 'a user can read only their own profile');
select isnt_empty($$update profiles set full_name = 'Parent 1' where id = 'a0000000-0000-4000-8000-000000000001' returning id$$,
  'a user can update their own profile');
select is_empty($$update profiles set full_name = 'x' where id = 'a0000000-0000-4000-8000-000000000002' returning id$$,
  'a user cannot update another profile');
select throws_ok($$update profiles set role = 'tutor' where id = 'a0000000-0000-4000-8000-000000000001'$$,
  '42501', null, 'a user cannot change their own role to tutor');
select throws_ok($$update profiles set role = 'admin' where id = 'a0000000-0000-4000-8000-000000000001'$$,
  '42501', null, 'a user cannot make themselves admin');

set local request.jwt.claims to '{"sub":"a0000000-0000-4000-8000-000000000006","role":"authenticated"}';
select ok((select count(*) >= 6 from profiles), 'admin can read all profiles');
select isnt_empty($$update profiles set full_name = 'Edited by admin' where id = 'a0000000-0000-4000-8000-000000000002' returning id$$,
  'admin can update any profile');
select lives_ok($$update profiles set role = 'tutor' where id = 'a0000000-0000-4000-8000-000000000002'$$,
  'admin can change a role');
update profiles set role = 'parent' where id = 'a0000000-0000-4000-8000-000000000002';

-- Demo requests -------------------------------------------------------------------------------
set local role anon;
set local request.jwt.claims to '{"role":"anon"}';
select lives_ok($$insert into demo_requests (tutor_id, parent_id, parent_name, parent_phone, class_band, subject, mode, status, tutor_note)
  values ('a0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'Guest', '9111111111', '9-10', 'Maths', 'Online', 'accepted', 'forged')$$,
  'anon can send a demo request');
select throws_like($$insert into demo_requests (tutor_id, parent_name, parent_phone, class_band, subject, mode)
  values ('a0000000-0000-4000-8000-000000000003', 'Guest', '+919111111111', '9-10', 'Maths', 'Online')$$,
  '%open request%', 'a second open request from the same phone to the same tutor is rejected');
select throws_like($$insert into demo_requests (tutor_id, parent_name, parent_phone, class_band, subject, mode)
  values ('a0000000-0000-4000-8000-000000000004', 'Guest', '9111111111', '9-10', 'Biology', 'Online')$$,
  '%does not offer%', 'a subject the tutor does not teach is rejected');
select throws_like($$insert into demo_requests (tutor_id, parent_name, parent_phone, class_band, subject, mode)
  values ('a0000000-0000-4000-8000-000000000004', 'Guest', '9111111111', '11-12', 'Maths', 'Online')$$,
  '%does not offer%', 'a class band the tutor does not teach is rejected');
select throws_like($$insert into demo_requests (tutor_id, parent_name, parent_phone, class_band, subject, mode)
  values ('a0000000-0000-4000-8000-000000000003', 'Guest', '9444444444', '9-10', 'Maths', 'Hybrid')$$,
  '%does not offer%', 'a mode the tutor does not offer is rejected');
select throws_ok($$select 1 from demo_requests$$, '42501', null, 'anon cannot read demo requests');

reset role;
set local request.jwt.claims to '';
select results_eq($$select parent_id, status::text, tutor_note from demo_requests where parent_phone = '9111111111'$$,
  $$values (null::uuid, 'new'::text, null::text)$$,
  'guest request is forced to parent_id null, status new, tutor_note null');

-- Draft tutor cannot receive requests
update tutors set status = 'draft' where id = 'a0000000-0000-4000-8000-000000000005';
set local role anon;
set local request.jwt.claims to '{"role":"anon"}';
select throws_like($$insert into demo_requests (tutor_id, parent_name, parent_phone, class_band, subject, mode)
  values ('a0000000-0000-4000-8000-000000000005', 'Guest', '9555555555', '9-10', 'Maths', 'Online')$$,
  '%not available%', 'a request to a tutor who is not approved is rejected');
select throws_like($$insert into demo_requests (tutor_id, parent_name, parent_phone, class_band, subject, mode)
  values ('a0000000-0000-4000-8000-0000000000ff', 'Guest', '9555555555', '9-10', 'Maths', 'Online')$$,
  '%not available%', 'a request to a tutor who does not exist is rejected');
reset role;
set local request.jwt.claims to '';
update tutors set status = 'approved' where id = 'a0000000-0000-4000-8000-000000000005';

-- Rate limit: 5 requests from one phone (in either format) in 24 hours, then the 6th fails.
insert into demo_requests (tutor_id, parent_name, parent_phone, class_band, subject, mode, status)
select 'a0000000-0000-4000-8000-000000000003', 'Spammer', p, '9-10', 'Maths', 'Online', 'closed'
from unnest(array['9222222222', '+919222222222', '9222222222', '+919222222222', '9222222222']) p;
set local role anon;
set local request.jwt.claims to '{"role":"anon"}';
select throws_like($$insert into demo_requests (tutor_id, parent_name, parent_phone, class_band, subject, mode)
  values ('a0000000-0000-4000-8000-000000000004', 'Spammer', '9222222222', '9-10', 'Maths', 'Online')$$,
  '%too many%', 'a 6th request from one phone in 24 hours is rejected');
select lives_ok($$insert into demo_requests (tutor_id, parent_name, parent_phone, class_band, subject, mode)
  values ('a0000000-0000-4000-8000-000000000004', 'Other', '9333333333', '9-10', 'Maths', 'Online')$$,
  'a different phone number is not affected by the limit');

-- Parent 1 sends a request to tutor B
set local role authenticated;
set local request.jwt.claims to '{"sub":"a0000000-0000-4000-8000-000000000001","role":"authenticated"}';
select lives_ok($$insert into demo_requests (id, tutor_id, parent_name, parent_phone, class_band, subject, mode)
  values ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000004', 'Parent One', '9000000001', '9-10', 'Maths', 'Online')$$,
  'a parent can send a demo request');
select results_eq($$select parent_id from demo_requests$$,
  $$values ('a0000000-0000-4000-8000-000000000001'::uuid)$$,
  'a parent sees only their own request, with parent_id set to them');
select is_empty($$update demo_requests set status = 'closed' where id = 'b0000000-0000-4000-8000-000000000001' returning id$$,
  'a parent cannot update their request');
select is(tutor_contact_for_request('b0000000-0000-4000-8000-000000000001'), null,
  'tutor phone is hidden while the request is new');

set local request.jwt.claims to '{"sub":"a0000000-0000-4000-8000-000000000002","role":"authenticated"}';
select is_empty($$select 1 from demo_requests$$, 'a parent cannot read another parent''s requests');

-- Tutor B handles the request; cannot touch tutor A's
set local request.jwt.claims to '{"sub":"a0000000-0000-4000-8000-000000000004","role":"authenticated"}';
select isnt_empty($$select 1 from demo_requests where id = 'b0000000-0000-4000-8000-000000000001'$$,
  'a tutor can read requests sent to them');
select is_empty($$select 1 from demo_requests where tutor_id = 'a0000000-0000-4000-8000-000000000003'$$,
  'tutor B cannot read tutor A''s requests');
select is_empty($$update demo_requests set status = 'declined' where tutor_id = 'a0000000-0000-4000-8000-000000000003' returning id$$,
  'tutor B cannot update tutor A''s requests');
select throws_ok($$update demo_requests set parent_name = 'changed' where id = 'b0000000-0000-4000-8000-000000000001'$$,
  '42501', null, 'a tutor cannot change fields other than status and tutor_note');
select lives_ok($$update demo_requests set status = 'contacted', tutor_note = 'called' where id = 'b0000000-0000-4000-8000-000000000001'$$,
  'a tutor can update status and tutor_note');

set local request.jwt.claims to '{"sub":"a0000000-0000-4000-8000-000000000001","role":"authenticated"}';
select is(tutor_contact_for_request('b0000000-0000-4000-8000-000000000001'), null,
  'tutor phone is still hidden while the request is contacted');

set local request.jwt.claims to '{"sub":"a0000000-0000-4000-8000-000000000004","role":"authenticated"}';
select lives_ok($$update demo_requests set status = 'accepted' where id = 'b0000000-0000-4000-8000-000000000001'$$,
  'a tutor can accept a request');

set local request.jwt.claims to '{"sub":"a0000000-0000-4000-8000-000000000001","role":"authenticated"}';
select is(tutor_contact_for_request('b0000000-0000-4000-8000-000000000001'), '9800000002',
  'tutor phone is revealed to the parent once accepted');
set local request.jwt.claims to '{"sub":"a0000000-0000-4000-8000-000000000002","role":"authenticated"}';
select is(tutor_contact_for_request('b0000000-0000-4000-8000-000000000001'), null,
  'another parent cannot get the tutor phone');
set local request.jwt.claims to '{"sub":"a0000000-0000-4000-8000-000000000006","role":"authenticated"}';
select is(tutor_contact_for_request('b0000000-0000-4000-8000-000000000001'), '9800000002',
  'admin can get the tutor phone');
select ok((select count(*) >= 3 from demo_requests), 'admin can read all requests');

set local role anon;
set local request.jwt.claims to '{"role":"anon"}';
select throws_ok($$select tutor_contact_for_request('b0000000-0000-4000-8000-000000000001')$$,
  '42501', null, 'anon cannot call tutor_contact_for_request');

-- Contact messages ----------------------------------------------------------------------------
select lives_ok($$insert into contact_messages (name, reach, sender_type, message) values ('Visitor', '9666666666', 'Parent', 'Hello')$$,
  'anon can send a contact message');
select throws_ok($$insert into contact_messages (name, reach, sender_type, message, handled) values ('Visitor', '9666666666', 'Parent', 'Hi', true)$$,
  '42501', null, 'a contact message cannot be inserted as handled');
select throws_ok($$select 1 from contact_messages$$, '42501', null, 'anon cannot read contact messages');

set local role authenticated;
set local request.jwt.claims to '{"sub":"a0000000-0000-4000-8000-000000000001","role":"authenticated"}';
select is_empty($$select 1 from contact_messages$$, 'a parent cannot read contact messages');
select is_empty($$update contact_messages set handled = true returning id$$, 'a parent cannot update contact messages');

set local request.jwt.claims to '{"sub":"a0000000-0000-4000-8000-000000000006","role":"authenticated"}';
select isnt_empty($$select 1 from contact_messages where name = 'Visitor'$$, 'admin can read contact messages');
select isnt_empty($$update contact_messages set handled = true where name = 'Visitor' returning id$$, 'admin can mark a message handled');

-- Owner deletes own profile -------------------------------------------------------------------
set local request.jwt.claims to '{"sub":"a0000000-0000-4000-8000-000000000005","role":"authenticated"}';
select isnt_empty($$delete from tutors where id = 'a0000000-0000-4000-8000-000000000005' returning id$$,
  'a tutor can delete their own profile');

select * from finish();
rollback;
