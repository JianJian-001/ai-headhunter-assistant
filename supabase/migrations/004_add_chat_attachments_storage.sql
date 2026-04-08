-- Chat attachment storage bucket and policies.

insert into storage.buckets (id, name, public, file_size_limit)
values ('chat-attachments', 'chat-attachments', false, 52428800)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit;

drop policy if exists "Users can upload own chat attachments" on storage.objects;
create policy "Users can upload own chat attachments"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'chat-attachments'
    and (storage.foldername(name))[1] = 'chat'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

drop policy if exists "Users can read own chat attachments" on storage.objects;
create policy "Users can read own chat attachments"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'chat-attachments'
    and (storage.foldername(name))[1] = 'chat'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

drop policy if exists "Users can update own chat attachments" on storage.objects;
create policy "Users can update own chat attachments"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'chat-attachments'
    and (storage.foldername(name))[1] = 'chat'
    and (storage.foldername(name))[2] = auth.uid()::text
  )
  with check (
    bucket_id = 'chat-attachments'
    and (storage.foldername(name))[1] = 'chat'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

drop policy if exists "Users can delete own chat attachments" on storage.objects;
create policy "Users can delete own chat attachments"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'chat-attachments'
    and (storage.foldername(name))[1] = 'chat'
    and (storage.foldername(name))[2] = auth.uid()::text
  );
