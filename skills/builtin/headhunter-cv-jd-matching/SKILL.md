---

name: headhunter-cv-jd-matching
description: 候选人简历和职位匹配分析；当用户需要根据简历文件（单个或文件夹）与职位要求进行匹配分析、评分筛选、制定触达策略时使用。
dependency:
  system:
- cd headhunter-cv-jd-matching/scripts && npm install

---

# 概述

本技能用于基于候选人简历和职位信息，生成简历和职位匹配结果，对于符合要求的候选人（评分大于60分）制定具体的触达策略、沟通话术及风险防范措施。

# 使用实例

- 示例1： 简历文件路径 /Users/cslilong/Desktop/cv/姬冰可.pdf 职位要求：前端开发工程师，需要React和Vue经验，3年以上工作经验； 帮忙进行候选人简历和职位匹配分析
- 示例2： 简历文件存在 /Users/cslilong/Desktop/resumes 这个文件夹中，  职位要求：前端开发工程师，需要React和Vue经验，3年以上工作经验；  帮忙进行候选人简历和职位匹配筛选匹配和制定具体的触达策略、沟通话术及风险防范措施。

# 执行步骤

## 步骤1. 提取简历文件路径信息和职位信息

根据会话内容提取出简历文件路径 resume_file_path 或 文件夹路径 resume_file_dir_path ，以及职位信息 job_content_data ，解析出来以后请严格按照步骤2 和 步骤3 进行操作处理，不要自由发挥（因为下面步骤的脚本做了很多优化，会比直接模型发挥效果好很多）

## 步骤2. 根据会话中的路径信息提取分析简历文件进行简历职位匹配

根据 步骤1 提取出来的简历文件路径 resume_file_path 或 文件夹路径 resume_file_dir_path ，判断是单个简历文件还是简历文件夹 来处理，若是单个简历文件，则执行 步骤2.1 ； 若是简历文件夹，则执行 步骤2.2

### 步骤2.1. 单个简历文件处理

若路径是具体的某个简历文件，则基于简历文件路径和职位信息调用 `scripts/main.js` 生成简历和职位匹配结果、简历可疑点、面试辅助问答。脚本返回结果的格式为 JSON 串，包含简历和职位匹配结果、简历可疑点、面试辅助问答三部分内容。本步骤执行时间会比较长，执行命令后等待时长可以设置为 5 分钟，请耐心等待

- 安装依赖：scripts里有 package.json 文件，你可以使用 npm install 来安装依赖
- 调用入参为 resume_file_path 和 job_content_data 两个字符串，分别代表简历文件路径和职位要求描述信息
- 执行命令为 `cd headhunter-cv-jd-matching/scripts && node main.js "resume_file_path" "job_content_data"`
- 执行成功结果输出中会包含图片路径

### 步骤2.2. 批量简历文件夹处理

若路径是简历文件夹，则 基于 简历文件夹路径和职位信息 调用 scripts/main-batch.js 生成简历和职位匹配结果和排序，脚本返回结果的格式为json串，json串包含简历和职位匹配结果；执行命令后等待时长可以设置为5分钟，请耐心等待

- 安装依赖：scripts里有 package.json 文件，你可以使用 npm install 来安装依赖
- 调用入参为 resume_file_dir_path 和 job_content_data 两个字符串，分别代表简历文件路径和职位要求描述信息
- 执行命令为 `cd headhunter-cv-jd-matching/scripts && node main-batch.js "resume_file_dir_path" "job_content_data"`
- 执行成功结果输出中会包含markdown文件路径

## 步骤3. 合适候选人插入AI表格

通过更新后的招聘数据站 `headhunter-table-manage` 技能将合适的候选人添加到招聘项目进展表里。该步骤的飞书写入底座已经统一切换到 `lark-cli`，因此必须遵循以下规则：

- 先读取 `headhunter-table-manage` 的最新规则和其引用的 [../LARK-CLI-FEISHU-GUIDE.md](../LARK-CLI-FEISHU-GUIDE.md)
- 写入前必须先获取招聘项目进展表的真实字段结构
- 只把评分大于 60 分且确认合适的候选人写入招聘项目进展表
- 返回给用户时只输出结果 Markdown 和表格链接，不暴露底层命令
- 如果要和其他系统解耦，优先把职位侧信息映射到 [../headhunter_shared/contracts/job-contract.md](../headhunter_shared/contracts/job-contract.md)，候选人侧信息映射到 [../headhunter_shared/contracts/candidate-contract.md](../headhunter_shared/contracts/candidate-contract.md)

## 步骤4. 返回结果

按分支返回结果：

- 单个简历文件：根据步骤 2.1 返回的 JSON 结果，整理成结构化 Markdown 输出给用户
- 简历文件夹：根据步骤 2.2 执行结果中的 md 文件，以 Markdown 格式保持原样输出给用户
- 两种场景都要同时返回步骤 3 写入后的表格链接，禁止输出其他内容

