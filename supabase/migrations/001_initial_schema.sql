-- Domi Platform: Initial Schema
-- Run via Supabase Dashboard > SQL Editor or supabase db push

-- ============================================================
-- 1. profiles
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null default '',
  avatar_url text,
  is_merchant boolean not null default false,
  merchant_channel text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, nickname)
  values (new.id, coalesce(new.raw_user_meta_data->>'nickname', '用户'));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 2. conversations
-- ============================================================
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '新对话',
  mode text not null default 'agent' check (mode in ('agent', 'qa', 'web_search')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.conversations enable row level security;

create policy "Users can manage own conversations"
  on public.conversations for all using (auth.uid() = user_id);

create index idx_conversations_user on public.conversations(user_id, updated_at desc);

-- ============================================================
-- 3. messages
-- ============================================================
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null default '',
  skill_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);

alter table public.messages enable row level security;

create policy "Users can manage own messages"
  on public.messages for all
  using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id and c.user_id = auth.uid()
    )
  );

create index idx_messages_conversation on public.messages(conversation_id, created_at);

-- ============================================================
-- 4. skills
-- ============================================================
create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  icon text,
  skill_type text not null default 'builtin' check (skill_type in ('builtin', 'user_created', 'marketplace')),
  category text not null default '通用',
  invocation_method text,
  manifest jsonb,
  price numeric(10,2) not null default 0,
  is_published boolean not null default false,
  creator_id uuid references auth.users(id) on delete set null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.skills enable row level security;

-- Published/builtin skills are readable by all authenticated users
create policy "Anyone can view published or builtin skills"
  on public.skills for select
  using (is_published = true or skill_type = 'builtin' or creator_id = auth.uid());

-- Creators can manage their own skills
create policy "Creators can manage own skills"
  on public.skills for all
  using (creator_id = auth.uid());

-- Service role can insert builtin skills
create policy "Service role can manage all skills"
  on public.skills for all
  using (auth.role() = 'service_role');

create index idx_skills_slug on public.skills(slug);
create index idx_skills_type on public.skills(skill_type, is_published);

-- ============================================================
-- 5. user_skills (join table)
-- ============================================================
create table if not exists public.user_skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  skill_id uuid not null references public.skills(id) on delete cascade,
  source text not null default 'added' check (source in ('added', 'created', 'purchased')),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique(user_id, skill_id)
);

alter table public.user_skills enable row level security;

create policy "Users can manage own user_skills"
  on public.user_skills for all using (auth.uid() = user_id);

create index idx_user_skills_user on public.user_skills(user_id);

-- ============================================================
-- 6. purchases
-- ============================================================
create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  skill_id uuid not null references public.skills(id) on delete cascade,
  skill_name text not null,
  price numeric(10,2) not null default 0,
  subscription_days integer not null default 30,
  payment_channel text not null default 'wechat',
  status text not null default 'active' check (status in ('active', 'expired', 'refunded')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.purchases enable row level security;

create policy "Users can view own purchases"
  on public.purchases for select using (auth.uid() = user_id);
create policy "Users can insert own purchases"
  on public.purchases for insert with check (auth.uid() = user_id);

create index idx_purchases_user on public.purchases(user_id, created_at desc);

-- ============================================================
-- 7. Seed builtin skills
-- ============================================================
insert into public.skills (slug, name, description, icon, skill_type, category, invocation_method, manifest) values
  ('headhunter-chat', '猎头AI助手', '猎头业务默认问候与通用问答入口，负责承接未命中特定流程的对话。', '💬', 'builtin', '通用', '/chat', '{"version":"1.0","role":"猎头AI助手"}'),
  ('skill-creator', '技能创建助手', '用于创建、完善和包装新技能，适用于对话创建技能和基于技能文件包的二次完善。', '🛠️', 'builtin', '运营专员', '/skill-creator', '{"version":"1.0","role":"技能创建助手"}'),
  ('headhunter-find-job', '招聘岗位信息获取', '通过浏览器自动化获取招聘岗位信息；适用于查岗位、看 JD、看某公司或地区职位列表。', '🔍', 'builtin', 'BD专员', '/find-job', '{"version":"1.0","role":"寻访研究员","scripts":[{"name":"search_jobs","runtime":"python","path":"scripts/search_jobs.py"}],"env_vars":["PLAYWRIGHT_BROWSERS_PATH"]}'),
  ('headhunter-candidate-sourcing', '候选人寻访', '拿到岗位后执行全网与本地知识库候选人寻访、统一去重打分、输出 Top10 候选人。', '🎯', 'builtin', '寻访研究员', '/candidate-sourcing', '{"version":"1.0","role":"寻访研究员","scripts":[{"name":"run_platform_sourcing_pipeline","runtime":"python","path":"scripts/run_platform_sourcing_pipeline.py"}],"env_vars":["PLAYWRIGHT_BROWSERS_PATH"]}'),
  ('headhunter-cv-jd-matching', '简历JD匹配', '根据简历文件或简历文件夹与职位要求做匹配分析、评分筛选，并给出触达策略。', '📊', 'builtin', '寻访研究员', '/cv-jd-matching', '{"version":"1.0","role":"寻访研究员","scripts":[{"name":"main","runtime":"node","path":"scripts/main.js"}]}'),
  ('headhunter-search-report', '岗位分析报告', '生成猎头岗位分析报告并同步到飞书文档和岗位库。', '📋', 'builtin', '执行顾问', '/search-report', '{"version":"1.0","role":"寻访研究员","scripts":[{"name":"feishu_api","runtime":"python","path":"scripts/feishu_api.py"}],"env_vars":["FEISHU_APP_ID","FEISHU_APP_SECRET"]}'),
  ('headhunter-candidate-report', '候选人推荐报告', '生成招聘候选人推荐报告并写入飞书文档，适用于会议纪要和推荐总结场景。', '📝', 'builtin', '执行顾问', '/candidate-report', '{"version":"1.0","role":"执行顾问","scripts":[{"name":"feishu_api","runtime":"python","path":"scripts/feishu_api.py"}],"env_vars":["FEISHU_APP_ID","FEISHU_APP_SECRET"]}'),
  ('headhunter-outreach-message', '首次触达文案', '为猎头顾问生成候选人首次触达和首轮跟进文案，并规划外部渠道触达节奏。', '✉️', 'builtin', '执行顾问', '/outreach-message', '{"version":"1.0","role":"寻访研究员"}'),
  ('headhunter-greeting-skill', '候选人跟进关怀', '处理候选人建立联系之后的持续跟进、节点保温、微信问候发送和下一步动作建议。', '👋', 'builtin', '执行顾问', '/greeting', '{"version":"1.0","role":"寻访研究员","scripts":[{"name":"main","runtime":"python","path":"scripts/main.py"}]}'),
  ('headhunter-client-nurture', '客户关系维护', '维护存量客户关系、识别续单与新需求信号、输出客户关怀动作和下一步建议。', '🤝', 'builtin', '大客户经理', '/client-nurture', '{"version":"1.0","role":"大客户经理","scripts":[{"name":"client_tier_score","runtime":"python","path":"scripts/client_tier_score.py"}]}'),
  ('headhunter-table-manage', '飞书工作台', '猎头数字分身在飞书中的工作台；用于管理招聘项目进展、岗位库、人才库和推荐报告。', '📁', 'builtin', '运营专员', '/table-manage', '{"version":"1.0","role":"运营专员","scripts":[{"name":"feishu_api","runtime":"python","path":"scripts/feishu_api.py"}],"env_vars":["FEISHU_APP_ID","FEISHU_APP_SECRET"]}')
on conflict (slug) do nothing;
