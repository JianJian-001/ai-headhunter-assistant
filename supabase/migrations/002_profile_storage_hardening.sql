-- Supabase hardening for profile sync and skill package storage

-- ============================================================
-- 1. Auto-update updated_at
-- ============================================================
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists set_conversations_updated_at on public.conversations;
create trigger set_conversations_updated_at
  before update on public.conversations
  for each row execute function public.set_updated_at();

drop trigger if exists set_skills_updated_at on public.skills;
create trigger set_skills_updated_at
  before update on public.skills
  for each row execute function public.set_updated_at();

-- ============================================================
-- 2. Storage bucket for uploaded skill packages
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit)
values ('skill-packages', 'skill-packages', false, 52428800)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit;

drop policy if exists "Users can upload own skill packages" on storage.objects;
create policy "Users can upload own skill packages"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'skill-packages'
    and (storage.foldername(name))[1] = 'skills'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

drop policy if exists "Users can read own skill packages" on storage.objects;
create policy "Users can read own skill packages"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'skill-packages'
    and (storage.foldername(name))[1] = 'skills'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

drop policy if exists "Users can update own skill packages" on storage.objects;
create policy "Users can update own skill packages"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'skill-packages'
    and (storage.foldername(name))[1] = 'skills'
    and (storage.foldername(name))[2] = auth.uid()::text
  )
  with check (
    bucket_id = 'skill-packages'
    and (storage.foldername(name))[1] = 'skills'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

drop policy if exists "Users can delete own skill packages" on storage.objects;
create policy "Users can delete own skill packages"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'skill-packages'
    and (storage.foldername(name))[1] = 'skills'
    and (storage.foldername(name))[2] = auth.uid()::text
  );
