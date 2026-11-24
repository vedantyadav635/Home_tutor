-- Fixes from `supabase db advisors --type security`.

-- Pin search_path on the remaining helper functions.
alter function public.opt_boards()       set search_path = '';
alter function public.opt_class_bands()  set search_path = '';
alter function public.opt_subjects()     set search_path = '';
alter function public.opt_modes()        set search_path = '';
alter function public.opt_languages()    set search_path = '';
alter function public.opt_availability() set search_path = '';
alter function public.set_updated_at()   set search_path = '';

-- Insert policy no longer "always true". The before-insert trigger already sets parent_id
-- to auth.uid(), so this only adds a second line of defence.
alter policy demo_requests_insert on public.demo_requests
  with check (parent_id is null or parent_id = (select auth.uid()));
