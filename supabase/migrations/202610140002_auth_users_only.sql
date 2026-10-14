-- Run in the Supabase SQL Editor after disabling new user sign-ups.
-- Safe for projects that ran all or only part of 202610140001_initial.sql.
-- The old allowed_teachers table/function may remain, but are no longer used.

begin;

create table if not exists public.rubrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  "taskDescription" text not null default '',
  criteria jsonb not null check (jsonb_typeof(criteria) = 'array'),
  "createdAt" bigint not null default (extract(epoch from now()) * 1000)::bigint,
  "updatedAt" bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  "rubricId" uuid not null,
  "rubricTitle" text not null,
  "studentName" text not null default '',
  "studentId" text not null default '',
  "fileName" text not null,
  "extractedText" text not null,
  evaluation jsonb,
  "createdAt" bigint not null default (extract(epoch from now()) * 1000)::bigint,
  "updatedAt" bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create index if not exists rubrics_user_updated_idx on public.rubrics (user_id, "updatedAt" desc);
create index if not exists submissions_user_created_idx on public.submissions (user_id, "createdAt" desc);
alter table public.rubrics enable row level security;
alter table public.submissions enable row level security;
grant select, insert, update, delete on public.rubrics, public.submissions to authenticated;

-- Check the current Auth user on every database request. Deleting the Auth
-- account then removes database access even before an issued JWT expires.
create schema if not exists private;
create or replace function private.is_registered_auth_user() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from auth.users u
    where u.id = (select auth.uid())
      and u.email is not null
      and u.is_anonymous is false
  );
$$;
revoke all on function private.is_registered_auth_user() from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_registered_auth_user() to authenticated;

drop policy if exists teacher_rubrics on public.rubrics;
create policy teacher_rubrics on public.rubrics for all to authenticated
  using (user_id = (select auth.uid()) and (select private.is_registered_auth_user()))
  with check (user_id = (select auth.uid()) and (select private.is_registered_auth_user()));
drop policy if exists rubrics_owner_guard on public.rubrics;
create policy rubrics_owner_guard on public.rubrics as restrictive for all to authenticated
  using (user_id = (select auth.uid()) and (select private.is_registered_auth_user()))
  with check (user_id = (select auth.uid()) and (select private.is_registered_auth_user()));

drop policy if exists teacher_submissions on public.submissions;
create policy teacher_submissions on public.submissions for all to authenticated
  using (user_id = (select auth.uid()) and (select private.is_registered_auth_user()))
  with check (user_id = (select auth.uid()) and (select private.is_registered_auth_user()));
drop policy if exists submissions_owner_guard on public.submissions;
create policy submissions_owner_guard on public.submissions as restrictive for all to authenticated
  using (user_id = (select auth.uid()) and (select private.is_registered_auth_user()))
  with check (user_id = (select auth.uid()) and (select private.is_registered_auth_user()));

create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new."createdAt" = old."createdAt";
  new."updatedAt" = (extract(epoch from now()) * 1000)::bigint;
  return new;
end;
$$;
drop trigger if exists rubrics_updated on public.rubrics;
create trigger rubrics_updated before update on public.rubrics for each row execute function public.touch_updated_at();
drop trigger if exists submissions_updated on public.submissions;
create trigger submissions_updated before update on public.submissions for each row execute function public.touch_updated_at();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pdf-uploads', 'pdf-uploads', false, 15728640, array['application/pdf'])
on conflict (id) do nothing;

drop policy if exists pdf_insert on storage.objects;
create policy pdf_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'pdf-uploads' and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select private.is_registered_auth_user()));
drop policy if exists pdf_read on storage.objects;
create policy pdf_read on storage.objects for select to authenticated
  using (bucket_id = 'pdf-uploads' and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select private.is_registered_auth_user()));
drop policy if exists pdf_delete on storage.objects;
create policy pdf_delete on storage.objects for delete to authenticated
  using (bucket_id = 'pdf-uploads' and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select private.is_registered_auth_user()));
drop policy if exists pdf_owner_guard on storage.objects;
create policy pdf_owner_guard on storage.objects as restrictive for all to authenticated
  using (bucket_id <> 'pdf-uploads' or ((storage.foldername(name))[1] = (select auth.uid())::text
    and (select private.is_registered_auth_user())))
  with check (bucket_id <> 'pdf-uploads' or ((storage.foldername(name))[1] = (select auth.uid())::text
    and (select private.is_registered_auth_user())));

notify pgrst, 'reload schema';

commit;
