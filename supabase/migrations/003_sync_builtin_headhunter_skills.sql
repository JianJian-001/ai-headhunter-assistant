-- Sync builtin headhunter skills to the latest HeadhunterSkills set.

insert into public.skills (
  slug,
  name,
  description,
  icon,
  skill_type,
  category,
  invocation_method,
  manifest,
  price,
  is_published,
  enabled
) values
  ('headhunter-chat', '猎头AI助手', '猎头业务默认问候与通用问答入口，负责承接未命中特定流程的对话。', '💬', 'builtin', '通用', '/chat', '{"version":"1.0","role":"猎头AI助手"}', 0, true, true),
  ('skill-creator', '技能创建助手', '用于创建、完善和包装新技能，适用于对话创建技能和基于技能文件包的二次完善。', '🛠️', 'builtin', '运营专员', '/skill-creator', '{"version":"1.0","role":"技能创建助手"}', 0, true, true),
  ('headhunter-find-job', '招聘岗位信息获取', '通过浏览器自动化获取招聘岗位信息；适用于查岗位、看 JD、看某公司或地区职位列表。', '🔍', 'builtin', 'BD专员', '/find-job', '{"version":"1.0","role":"寻访研究员","scripts":[{"name":"search_jobs","runtime":"python","path":"scripts/search_jobs.py"}],"env_vars":["PLAYWRIGHT_BROWSERS_PATH"]}', 0, true, true),
  ('headhunter-candidate-sourcing', '候选人寻访', '拿到岗位后执行全网与本地知识库候选人寻访、统一去重打分、输出 Top10 候选人。', '🎯', 'builtin', '寻访研究员', '/candidate-sourcing', '{"version":"1.0","role":"寻访研究员","scripts":[{"name":"run_platform_sourcing_pipeline","runtime":"python","path":"scripts/run_platform_sourcing_pipeline.py"}],"env_vars":["PLAYWRIGHT_BROWSERS_PATH"]}', 0, true, true),
  ('headhunter-cv-jd-matching', '简历JD匹配', '根据简历文件或简历文件夹与职位要求做匹配分析、评分筛选，并给出触达策略。', '📊', 'builtin', '寻访研究员', '/cv-jd-matching', '{"version":"1.0","role":"寻访研究员","scripts":[{"name":"main","runtime":"node","path":"scripts/main.js"}]}', 0, true, true),
  ('headhunter-search-report', '岗位分析报告', '生成猎头岗位分析报告并同步到飞书文档和岗位库。', '📋', 'builtin', '执行顾问', '/search-report', '{"version":"1.0","role":"寻访研究员","scripts":[{"name":"feishu_api","runtime":"python","path":"scripts/feishu_api.py"}],"env_vars":["FEISHU_APP_ID","FEISHU_APP_SECRET"]}', 0, true, true),
  ('headhunter-candidate-report', '候选人推荐报告', '生成招聘候选人推荐报告并写入飞书文档，适用于会议纪要和推荐总结场景。', '📝', 'builtin', '执行顾问', '/candidate-report', '{"version":"1.0","role":"执行顾问","scripts":[{"name":"feishu_api","runtime":"python","path":"scripts/feishu_api.py"}],"env_vars":["FEISHU_APP_ID","FEISHU_APP_SECRET"]}', 0, true, true),
  ('headhunter-outreach-message', '首次触达文案', '为猎头顾问生成候选人首次触达和首轮跟进文案，并规划外部渠道触达节奏。', '✉️', 'builtin', '执行顾问', '/outreach-message', '{"version":"1.0","role":"寻访研究员"}', 0, true, true),
  ('headhunter-greeting-skill', '候选人跟进关怀', '处理候选人建立联系之后的持续跟进、节点保温、微信问候发送和下一步动作建议。', '👋', 'builtin', '执行顾问', '/greeting', '{"version":"1.0","role":"寻访研究员","scripts":[{"name":"main","runtime":"python","path":"scripts/main.py"}]}', 0, true, true),
  ('headhunter-client-nurture', '客户关系维护', '维护存量客户关系、识别续单与新需求信号、输出客户关怀动作和下一步建议。', '🤝', 'builtin', '大客户经理', '/client-nurture', '{"version":"1.0","role":"大客户经理","scripts":[{"name":"client_tier_score","runtime":"python","path":"scripts/client_tier_score.py"}]}', 0, true, true),
  ('headhunter-table-manage', '飞书工作台', '猎头数字分身在飞书中的工作台；用于管理招聘项目进展、岗位库、人才库和推荐报告。', '📁', 'builtin', '运营专员', '/table-manage', '{"version":"1.0","role":"运营专员","scripts":[{"name":"feishu_api","runtime":"python","path":"scripts/feishu_api.py"}],"env_vars":["FEISHU_APP_ID","FEISHU_APP_SECRET"]}', 0, true, true)
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  icon = excluded.icon,
  skill_type = excluded.skill_type,
  category = excluded.category,
  invocation_method = excluded.invocation_method,
  manifest = excluded.manifest,
  price = excluded.price,
  is_published = excluded.is_published,
  enabled = excluded.enabled,
  updated_at = now();
