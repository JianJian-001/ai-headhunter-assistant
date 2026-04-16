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
  ('headhunter-chat', '猎头AI助手', '一期猎头业务默认问候与通用问答入口，负责承接未命中特定流程的对话并在一期技能之间做自动路由。', '💬', 'builtin', '通用', '/chat', '{"version":"1.0","role":"猎头AI助手"}', 0, true, true),
  ('skill-creator', '技能创建助手', '用于创建、完善和包装新技能，适用于对话创建技能和基于技能文件包的二次完善。', '🛠️', 'builtin', '运营专员', '/skill-creator', '{"version":"1.0","role":"技能创建助手"}', 0, true, true),
  ('headhunter-find-job', '招聘岗位信息获取', '基于用户提供的 JD 和岗位材料整理招聘情报；适用于梳理岗位要求、模糊点和追问项。', '🔍', 'builtin', 'BD专员', '/find-job', '{"version":"1.0","role":"寻访研究员","scripts":[{"name":"material_digest","runtime":"python","path":"scripts/material_digest.py"}]}', 0, true, true),
  ('headhunter-search-report', '做单秘籍', '输出岗位理解、寻访策略和接单建议；适用于职位理解失焦、客户意图不清或寻访方向发散。', '📋', 'builtin', '寻访研究员', '/search-report', '{"version":"1.0","role":"寻访研究员"}', 0, true, true),
  ('headhunter-cv-matching', '简历匹配分析', '基于本地简历文本和 JD 做匹配分析、评分筛选和批量排序，并输出匹配理由与 gap。', '📊', 'builtin', '寻访研究员', '/cv-matching', '{"version":"1.0","role":"寻访研究员","scripts":[{"name":"match_resume","runtime":"python","path":"scripts/match_resume.py"}]}', 0, true, true),
  ('headhunter-resume-risk-pro', '简历风险分析', '扫描时间线、学历与履历一致性风险，输出证据片段、核验清单和顾问话术。', '🛡️', 'builtin', '执行顾问', '/resume-risk', '{"version":"1.0","role":"寻访研究员","scripts":[{"name":"scan_resume_risk","runtime":"python","path":"scripts/scan_resume_risk.py"}]}', 0, true, true),
  ('headhunter-interview-coach', '面试智练', '围绕 JD、简历和风险点生成面试题库、多轮文本 mock 与复盘摘要。', '🎤', 'builtin', '执行顾问', '/interview-coach', '{"version":"1.0","role":"寻访研究员"}', 0, true, true),
  ('headhunter-candidate-report', '推荐报告生成', '结合简历、JD 和沟通纪要输出结构化候选人推荐报告，可按需导出本地 Markdown。', '📝', 'builtin', '执行顾问', '/candidate-report', '{"version":"1.0","role":"执行顾问"}', 0, true, true),
  ('headhunter-floating-cv', '高端候选人简历脱敏', '基于用户提供的简历正文和脱敏约定，对高端候选人简历做脱敏处理，并在对话中输出脱敏后的内容。', '🕶️', 'builtin', '执行顾问', '/floating-cv', '{"version":"1.0","role":"执行顾问"}', 0, true, true),
  ('headhunter-greeting-skill', '候选人跟进话术', '处理候选人建立联系之后的持续跟进、节点保温和下一步动作建议，只生成文案不执行发送。', '👋', 'builtin', '执行顾问', '/greeting', '{"version":"1.0","role":"寻访研究员"}', 0, true, true),
  ('headhunter-company-intel', '公司情报', '基于用户提供材料归纳公司基本情况、业务特点、高管、融资、招聘职位和客户开发策略。', '🏢', 'builtin', 'BD专员', '/company-intel', '{"version":"1.0","role":"BD顾问"}', 0, true, true)
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

delete from public.skills
where skill_type = 'builtin'
  and slug in (
    'headhunter-candidate-sourcing',
    'headhunter-cv-jd-matching',
    'headhunter-outreach-message',
    'headhunter-client-nurture',
    'headhunter-table-manage'
  );
