-- search_tutors, plus tutor-photos storage policies.
-- Expected results come from running the prototype's filtered() on 8 sample tutors. The seed only keeps 2 of them
-- (supabase/seed.sql), so this file adds the other 6 itself, inside its own rolled-back transaction.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

-- Fixtures: sample tutors 3-8 (tutors 1 and 2 come from the seed). Runs as a privileged session, like a migration.
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
values ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'sneha-kulkarni@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{"role":"tutor","full_name":"Sneha Kulkarni"}', now(), now(), '', '', '', '');
insert into public.tutors (id, slug, full_name, qualification, years_experience, city, area, travel_range, bio, methodology, fee_text, fee_amount, fee_unit, subjects, class_bands, boards, modes, languages, availability, status, verified, submitted_at, approved_at)
values ('00000000-0000-4000-8000-000000000003', 'sneha-kulkarni', 'Sneha Kulkarni', 'M.A. English, CELTA', 6, 'Pune', 'Aundh', 'Up to 4 km from Aundh', 'Grammar, reading and creative writing for Class 1–10. Patient with young learners and shy speakers.', 'Short reading sessions, a vocabulary notebook, and one writing task a week with written feedback.', '₹3,500 / month', 3500, 'month',
  array['English','Hindi']::text[], array['1-8','9-10']::text[], array['CBSE','ICSE']::text[], array['Home Visit']::text[], array['English','Hindi','Bilingual']::text[], array['Mon:afternoon','Mon:evening','Tue:afternoon','Tue:evening','Wed:afternoon','Wed:evening','Thu:afternoon','Thu:evening','Fri:afternoon','Sat:morning']::text[], 'approved', true, now(), now());
insert into public.tutor_experience (tutor_id, period, title, details, sort_order) values ('00000000-0000-4000-8000-000000000003', '2020 – now', 'Home tutor', 'Teaches 12 students a week across Aundh and Pashan.', 0);
insert into public.tutor_experience (tutor_id, period, title, details, sort_order) values ('00000000-0000-4000-8000-000000000003', '2018 – 2020', 'English teacher, Orchid School', 'Taught Class 4–7 English.', 1);
insert into public.tutor_education (tutor_id, item, sort_order) values ('00000000-0000-4000-8000-000000000003', 'M.A. English Literature, Fergusson College', 0);
insert into public.tutor_education (tutor_id, item, sort_order) values ('00000000-0000-4000-8000-000000000003', 'CELTA, Cambridge English', 1);

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
values ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'amit-joshi@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{"role":"tutor","full_name":"Amit Joshi"}', now(), now(), '', '', '', '');
insert into public.tutors (id, slug, full_name, qualification, years_experience, city, area, travel_range, bio, methodology, fee_text, fee_amount, fee_unit, subjects, class_bands, boards, modes, languages, availability, status, verified, submitted_at, approved_at)
values ('00000000-0000-4000-8000-000000000004', 'amit-joshi', 'Amit Joshi', 'B.Sc., B.Ed.', 12, 'Pune', 'Hadapsar', 'Hadapsar, Magarpatta, Kharadi', 'Twelve years of teaching Science and Maths for State Board students, in Marathi, Hindi or English medium.', 'Chapter-wise notes, diagrams practised by hand, and a revision test at the end of each month.', '₹3,000 / month', 3000, 'month',
  array['Science','Maths']::text[], array['1-8','9-10']::text[], array['State Board','CBSE']::text[], array['Home Visit','Hybrid']::text[], array['Hindi','Bilingual']::text[], array['Mon:morning','Mon:evening','Tue:morning','Tue:evening','Wed:morning','Wed:evening','Thu:morning','Thu:evening','Fri:morning','Fri:evening','Sat:morning','Sat:afternoon']::text[], 'approved', false, now(), now());
insert into public.tutor_experience (tutor_id, period, title, details, sort_order) values ('00000000-0000-4000-8000-000000000004', '2014 – now', 'Home tutor', 'Over 150 students taught in Hadapsar and Magarpatta.', 0);
insert into public.tutor_experience (tutor_id, period, title, details, sort_order) values ('00000000-0000-4000-8000-000000000004', '2012 – 2014', 'Teacher, Sadhana Vidyalaya', 'Taught Class 6–9 Science.', 1);
insert into public.tutor_education (tutor_id, item, sort_order) values ('00000000-0000-4000-8000-000000000004', 'B.Sc. Chemistry, Pune University', 0);
insert into public.tutor_education (tutor_id, item, sort_order) values ('00000000-0000-4000-8000-000000000004', 'B.Ed., Pune University', 1);

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
values ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'fatima-shaikh@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{"role":"tutor","full_name":"Fatima Shaikh"}', now(), now(), '', '', '', '');
insert into public.tutors (id, slug, full_name, qualification, years_experience, city, area, travel_range, bio, methodology, fee_text, fee_amount, fee_unit, subjects, class_bands, boards, modes, languages, availability, status, verified, submitted_at, approved_at)
values ('00000000-0000-4000-8000-000000000005', 'fatima-shaikh', 'Fatima Shaikh', 'M.Sc. Biology, B.Ed.', 4, 'Pune', 'Wanowrie', 'Wanowrie, Kondhwa, NIBM', 'Biology for Class 9–12 and NEET. Diagram-heavy lessons and NCERT line-by-line revision.', 'NCERT first, then previous NEET questions by chapter. Students keep a diagram book reviewed every week.', '₹4,500 / month', 4500, 'month',
  array['Biology','Science']::text[], array['9-10','11-12','exam']::text[], array['CBSE','State Board','Competitive Exams']::text[], array['Online','Home Visit']::text[], array['English','Hindi']::text[], array['Mon:afternoon','Mon:evening','Tue:afternoon','Tue:evening','Wed:afternoon','Wed:evening','Thu:afternoon','Thu:evening','Fri:afternoon','Fri:evening','Sat:afternoon','Sat:evening','Sun:morning']::text[], 'approved', true, now(), now());
insert into public.tutor_experience (tutor_id, period, title, details, sort_order) values ('00000000-0000-4000-8000-000000000005', '2022 – now', 'NEET Biology tutor', 'Students average a 40-mark rise in NEET mock Biology scores.', 0);
insert into public.tutor_education (tutor_id, item, sort_order) values ('00000000-0000-4000-8000-000000000005', 'M.Sc. Zoology, Abeda Inamdar College', 0);
insert into public.tutor_education (tutor_id, item, sort_order) values ('00000000-0000-4000-8000-000000000005', 'B.Ed., Pune University', 1);

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
values ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-000000000006', 'authenticated', 'authenticated', 'rohan-patil@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{"role":"tutor","full_name":"Rohan Patil"}', now(), now(), '', '', '', '');
insert into public.tutors (id, slug, full_name, qualification, years_experience, city, area, travel_range, bio, methodology, fee_text, fee_amount, fee_unit, subjects, class_bands, boards, modes, languages, availability, status, verified, submitted_at, approved_at)
values ('00000000-0000-4000-8000-000000000006', 'rohan-patil', 'Rohan Patil', 'M.A. Geography', 3, 'Pune', 'Pimple Saudagar', 'Pimple Saudagar, Wakad, Aundh', 'Makes Social Studies and GK easy to remember with maps, timelines and quick quizzes.', 'Map practice every session and a 10-question quiz at the start of each class.', '₹2,500 / month', 2500, 'month',
  array['Geography','History','GK']::text[], array['1-8','9-10']::text[], array['State Board','ICSE']::text[], array['Home Visit','Online']::text[], array['English','Bilingual']::text[], array['Mon:evening','Tue:evening','Wed:evening','Thu:evening','Fri:evening','Sat:morning','Sat:afternoon','Sat:evening','Sun:morning','Sun:afternoon']::text[], 'approved', false, now(), now());
insert into public.tutor_experience (tutor_id, period, title, details, sort_order) values ('00000000-0000-4000-8000-000000000006', '2023 – now', 'Home tutor', 'Teaches Class 5–10 Social Studies.', 0);
insert into public.tutor_education (tutor_id, item, sort_order) values ('00000000-0000-4000-8000-000000000006', 'M.A. Geography, Pune University', 0);

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
values ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-000000000007', 'authenticated', 'authenticated', 'kavita-iyer@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{"role":"tutor","full_name":"Kavita Iyer"}', now(), now(), '', '', '', '');
insert into public.tutors (id, slug, full_name, qualification, years_experience, city, area, travel_range, bio, methodology, fee_text, fee_amount, fee_unit, subjects, class_bands, boards, modes, languages, availability, status, verified, submitted_at, approved_at)
values ('00000000-0000-4000-8000-000000000007', 'kavita-iyer', 'Kavita Iyer', 'M.Com, CA Inter', 7, 'Pune', 'Viman Nagar', 'Viman Nagar, Kalyani Nagar', 'Accountancy and Economics for Class 11–12 Commerce, with board-paper practice from October.', 'Ledger practice with real examples, then sample papers under timed conditions.', '₹4,000 / month', 4000, 'month',
  array['Accounts','Economics']::text[], array['11-12']::text[], array['CBSE','State Board']::text[], array['Online','Hybrid']::text[], array['English']::text[], array['Mon:afternoon','Mon:evening','Tue:afternoon','Tue:evening','Wed:afternoon','Wed:evening','Thu:afternoon','Thu:evening','Fri:afternoon','Fri:evening','Sat:morning','Sat:afternoon']::text[], 'approved', true, now(), now());
insert into public.tutor_experience (tutor_id, period, title, details, sort_order) values ('00000000-0000-4000-8000-000000000007', '2019 – now', 'Commerce tutor', 'Taught 80+ Commerce students; class average 86% in Accounts.', 0);
insert into public.tutor_education (tutor_id, item, sort_order) values ('00000000-0000-4000-8000-000000000007', 'M.Com, Symbiosis College', 0);
insert into public.tutor_education (tutor_id, item, sort_order) values ('00000000-0000-4000-8000-000000000007', 'CA Intermediate', 1);

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
values ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-000000000008', 'authenticated', 'authenticated', 'nikhil-gaikwad@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{"role":"tutor","full_name":"Nikhil Gaikwad"}', now(), now(), '', '', '', '');
insert into public.tutors (id, slug, full_name, qualification, years_experience, city, area, travel_range, bio, methodology, fee_text, fee_amount, fee_unit, subjects, class_bands, boards, modes, languages, availability, status, verified, submitted_at, approved_at)
values ('00000000-0000-4000-8000-000000000008', 'nikhil-gaikwad', 'Nikhil Gaikwad', 'B.E. Computer Engg.', 2, 'Pune', 'Hinjewadi', 'Online only', 'Maths and coding basics (Python, Java) taught online with a shared whiteboard.', 'Live coding with the student typing, plus small weekly projects.', '₹600 / hour', 600, 'hour',
  array['Maths','Computer Science']::text[], array['1-8','9-10','11-12']::text[], array['CBSE','ICSE']::text[], array['Online']::text[], array['English','Hindi']::text[], array['Mon:evening','Tue:evening','Wed:evening','Thu:evening','Fri:evening','Sat:morning','Sat:afternoon','Sat:evening','Sun:morning','Sun:afternoon','Sun:evening']::text[], 'approved', false, now(), now());
insert into public.tutor_experience (tutor_id, period, title, details, sort_order) values ('00000000-0000-4000-8000-000000000008', '2024 – now', 'Online tutor', 'Teaches 15 students weekly.', 0);
insert into public.tutor_education (tutor_id, item, sort_order) values ('00000000-0000-4000-8000-000000000008', 'B.E. Computer Engineering, PICT', 0);

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
