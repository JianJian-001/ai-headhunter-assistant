-- Ephemeral attachment storage for temporary parser access.

insert into storage.buckets (id, name, public, file_size_limit)
values ('ephemeral-chat-attachments', 'ephemeral-chat-attachments', false, 52428800)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit;