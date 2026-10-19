-- Run once in the Supabase SQL Editor to enable database-backed support chat.
create table if not exists public.support_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null check (length(trim(subject)) between 1 and 150),
  category text not null check (length(trim(category)) between 1 and 80),
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.support_conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  message text not null check (length(trim(message)) between 1 and 5000),
  created_at timestamptz not null default now()
);

create index if not exists support_conversations_updated_idx on public.support_conversations (updated_at desc);
create index if not exists support_messages_conversation_idx on public.support_messages (conversation_id, created_at);

create or replace function public.touch_support_conversation()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.support_conversations set updated_at = now(), status = 'open'
  where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists support_message_touch_conversation on public.support_messages;
create trigger support_message_touch_conversation after insert on public.support_messages
for each row execute function public.touch_support_conversation();

alter table public.support_conversations enable row level security;
alter table public.support_messages enable row level security;

drop policy if exists "Users and admins read support conversations" on public.support_conversations;
create policy "Users and admins read support conversations" on public.support_conversations
for select to authenticated using (
  user_id = (select auth.uid()) or exists (
    select 1 from public.user_roles r where r.user_id = (select auth.uid())
      and r.role = 'admin' and r.is_active = true
  )
);

drop policy if exists "Users create own support conversations" on public.support_conversations;
create policy "Users create own support conversations" on public.support_conversations
for insert to authenticated with check (user_id = (select auth.uid()));

drop policy if exists "Admins update support conversations" on public.support_conversations;
create policy "Admins update support conversations" on public.support_conversations
for update to authenticated using (exists (
  select 1 from public.user_roles r where r.user_id = (select auth.uid())
    and r.role = 'admin' and r.is_active = true
)) with check (exists (
  select 1 from public.user_roles r where r.user_id = (select auth.uid())
    and r.role = 'admin' and r.is_active = true
));

drop policy if exists "Users and admins read support messages" on public.support_messages;
create policy "Users and admins read support messages" on public.support_messages
for select to authenticated using (exists (
  select 1 from public.support_conversations c where c.id = conversation_id and (
    c.user_id = (select auth.uid()) or exists (
      select 1 from public.user_roles r where r.user_id = (select auth.uid())
        and r.role = 'admin' and r.is_active = true
    )
  )
));

drop policy if exists "Conversation owners and admins send support messages" on public.support_messages;
create policy "Conversation owners and admins send support messages" on public.support_messages
for insert to authenticated with check (
  sender_id = (select auth.uid()) and exists (
    select 1 from public.support_conversations c where c.id = conversation_id and (
      c.user_id = (select auth.uid()) or exists (
        select 1 from public.user_roles r where r.user_id = (select auth.uid())
          and r.role = 'admin' and r.is_active = true
      )
    )
  )
);

grant select, insert, update on public.support_conversations to authenticated;
grant select, insert on public.support_messages to authenticated;
