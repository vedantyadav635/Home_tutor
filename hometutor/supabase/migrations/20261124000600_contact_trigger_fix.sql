-- Fix to 20261124000500: the trigger must not rewrite `handled`, or the insert policy
-- (with check handled = false) can no longer refuse handled = true. Leave that to the policy.
create or replace function public.contact_messages_before_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_privileged() then
    new.created_at := now();  -- so the 24-hour count can't be dodged with a backdated row
  end if;
  if (select count(*) from public.contact_messages
      where lower(reach) = lower(new.reach) and created_at > now() - interval '24 hours') >= 5 then
    raise exception 'too many messages from this contact today' using errcode = '53400';
  end if;
  return new;
end $$;
revoke execute on function public.contact_messages_before_insert() from public, anon, authenticated;
