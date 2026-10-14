-- Run once in Supabase SQL Editor. No teachers are allowed until added below.
create table public.allowed_teachers (
  email text primary key check (email = lower(email))
);
alter table public.allowed_teachers enable row level security;
revoke all on public.allowed_teachers from anon, authenticated;

create function public.is_allowed_teacher() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.allowed_teachers t
    join auth.users u on lower(u.email) = t.email
    where u.id = auth.uid()
  );
$$;
revoke all on function public.is_allowed_teacher() from public;
grant execute on function public.is_allowed_teacher() to authenticated;

create table public.rubrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  "taskDescription" text not null default '',
  criteria jsonb not null check (jsonb_typeof(criteria) = 'array'),
  "createdAt" bigint not null default (extract(epoch from now()) * 1000)::bigint,
  "updatedAt" bigint not null default (extract(epoch from now()) * 1000)::bigint
);
create table public.submissions (
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
create index on public.rubrics (user_id, "updatedAt" desc);
create index on public.submissions (user_id, "createdAt" desc);
alter table public.rubrics enable row level security;
alter table public.submissions enable row level security;
grant select, insert, update, delete on public.rubrics, public.submissions to authenticated;
create policy teacher_rubrics on public.rubrics for all to authenticated
  using (user_id = (select auth.uid()) and (select public.is_allowed_teacher()))
  with check (user_id = (select auth.uid()) and (select public.is_allowed_teacher()));
create policy teacher_submissions on public.submissions for all to authenticated
  using (user_id = (select auth.uid()) and (select public.is_allowed_teacher()))
  with check (user_id = (select auth.uid()) and (select public.is_allowed_teacher()));
create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new."createdAt" = old."createdAt";
  new."updatedAt" = (extract(epoch from now()) * 1000)::bigint;
  return new;
end;
$$;
create trigger rubrics_updated before update on public.rubrics for each row execute function public.touch_updated_at();
create trigger submissions_updated before update on public.submissions for each row execute function public.touch_updated_at();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pdf-uploads', 'pdf-uploads', false, 15728640, array['application/pdf']);
create policy pdf_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'pdf-uploads' and (storage.foldername(name))[1] = (select auth.uid())::text and (select public.is_allowed_teacher()));
create policy pdf_read on storage.objects for select to authenticated
  using (bucket_id = 'pdf-uploads' and (storage.foldername(name))[1] = (select auth.uid())::text and (select public.is_allowed_teacher()));
create policy pdf_delete on storage.objects for delete to authenticated
  using (bucket_id = 'pdf-uploads' and (storage.foldername(name))[1] = (select auth.uid())::text);
