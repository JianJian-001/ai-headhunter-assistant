const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const OUTPUT_DIR = path.join(__dirname, 'output');
const DEFAULT_JSON_PATH = path.join(__dirname, 'batch_result_sample.json');

const RANK_MEDALS = ['🥇', '🥈', '🥉'];

function getScoreColor(score) {
  if (score >= 80) return '#52c41a';
  if (score >= 60) return '#1890ff';
  if (score >= 40) return '#faad14';
  return '#f5222d';
}

function getScoreLabel(score) {
  if (score >= 80) return '优秀';
  if (score >= 60) return '良好';
  if (score >= 40) return '一般';
  return '较低';
}

function getDimensionBarColor(score) {
  if (score >= 8) return '#52c41a';
  if (score >= 6) return '#1890ff';
  if (score >= 4) return '#faad14';
  return '#f5222d';
}

// ======================== Markdown 生成 ========================

function generateMarkdown(dataList) {
  const sorted = [...dataList].sort(
    (a, b) => b.hireAiResumeMatchJobResultVO.matchScore - a.hireAiResumeMatchJobResultVO.matchScore
  );

  let markdown = '# 📋 多简历对比分析\n\n';
  markdown += `> 共 ${sorted.length} 份简历参与对比，按匹配度从高到低排列\n\n`;
  markdown += '---\n\n';

  // 总览表格
  markdown += '## 📊 匹配度总览\n\n';
  markdown += '| 排名 | 姓名 | 匹配度 | 评级 | 总结 |\n';
  markdown += '|:----:|:----:|:------:|:----:|:-----|\n';
  sorted.forEach((item, index) => {
    const match = item.hireAiResumeMatchJobResultVO;
    const medal = index < 3 ? RANK_MEDALS[index] : `${index + 1}`;
    const label = getScoreLabel(match.matchScore);
    markdown += `| ${medal} | **${match.name}** | ${match.matchScore}分 | ${label} | ${match.summary} |\n`;
  });
  markdown += '\n---\n\n';

  // 每个候选人详情
  sorted.forEach((item, index) => {
    const match = item.hireAiResumeMatchJobResultVO;
    const suspiciousPoints = item.resumeSuspiciousPointList || [];
    const interviewInsights = item.interviewInsightVOList || [];
    const medal = index < 3 ? RANK_MEDALS[index] : `#${index + 1}`;

    markdown += `## ${medal} 排名${index + 1} – ${match.name} - ${item.last_company}（匹配度：${match.matchScore}分）\n\n`;
    
    markdown += `### 📌 基本信息\n`;
    markdown += `- **学历**：${item.top_edu_degree}\n`;
    markdown += `- **工作年限**：${item.total_full_work_years}年 \n`;
    markdown += `- **联系方式**：📞 ${item.phone} | ✉️ [${item.email}](mailto:${item.email})\n`;

    markdown += `**总结**：${match.summary}\n\n`;
    // 维度评分
    markdown += '### 维度评分\n\n';
    markdown += '| 维度 | 评分 | 说明 |\n';
    markdown += '|:-----|:----:|:-----|\n';
    match.dimensions.forEach(dimension => {
      const clampedScore = Math.max(0, Math.min(100, dimension.score));
      const maxScore = Math.max(0, Math.min(100, dimension.maxScore));
      const bar = '█'.repeat(clampedScore) + '░'.repeat(Math.max(0,maxScore - clampedScore));
      markdown += `| ${dimension.evaluation} | ${bar} ${dimension.score}/${dimension.maxScore} | ${dimension.description} |\n`;
    });
    markdown += '\n';

    // 优势
    markdown += '### ✅ 优势\n\n';
    match.advantageDesc.forEach(adv => {
      markdown += `- ${adv}\n`;
    });
    markdown += '\n';
    /*
    // 劣势
    markdown += '### ⚠️ 劣势\n\n';
    match.disadvantageDesc.forEach(dis => {
      markdown += `- ${dis}\n`;
    });
    markdown += '\n';

    // 简历疑点
    if (suspiciousPoints.length > 0) {
      markdown += '### 🔍 简历疑点\n\n';
      suspiciousPoints.forEach((point, pointIndex) => {
        markdown += `${pointIndex + 1}. **${point.point}**\n`;
        markdown += `   - ${point.reason}\n`;
      });
      markdown += '\n';
    }

    // 面试建议
    if (interviewInsights.length > 0) {
      markdown += '### 💡 面试建议题目\n\n';
      interviewInsights.forEach((insight, insightIndex) => {
        markdown += `${insightIndex + 1}. **${insight.assessmentPoint}**\n`;
        markdown += `   - **建议问题**：${insight.suggestedQuestion}\n`;
        markdown += `   - **回答洞察**：${insight.responseInsights}\n`;
      });
      markdown += '\n';
    }
    */
    if (match.matchScore >= 60) {
       markdown += '### 💡 猎头沟通策略（Pitching Strategy）\n';
      markdown += '#### 【沟通开场白】\n';
      markdown += `> ${match.conversationOpener}\n`;
      markdown += '#### 【切入点分析 (Hook)】\n';
      markdown += `> ${match.conversationEntryPoint}\n`;

      markdown += '### 【拒绝风险与应对 (Risk & Counter)】\n';
      markdown += `- ⚠️ **风险点**：${match.rejectRisk}\n`;
      markdown += `- ✅ **应对策略**：${match.responseStrategy}\n`;
    } else {
      markdown += '### 💡 猎头沟通策略（Pitching Strategy）\n';
      markdown += `> 评估结论不太不匹配，不建议进行该岗位沟通推荐\n`;

    }
   
    markdown += '---\n\n';
  });

  return markdown;
}

// ======================== 图片生成 ========================

async function generateBatchMd(jsonFilePath, outputPrefix) {
  const inputPath = jsonFilePath;

  if (!fs.existsSync(inputPath)) {
    console.error('❌ JSON 文件不存在: ' + inputPath);
    process.exit(1);
  }

  const rawData = fs.readFileSync(inputPath, 'utf-8');
  const dataList = JSON.parse(rawData);

  if (!Array.isArray(dataList) || dataList.length === 0) {
    console.error('❌ JSON 数据应为非空数组');
    process.exit(1);
  }

  console.log('✅ 成功读取 JSON 数据，共 ' + dataList.length + ' 份简历');

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const prefix = outputPrefix || 'batch-compare';

  // 生成 Markdown
  const markdownContent = generateMarkdown(dataList);
  const markdownOutputPath = path.join(OUTPUT_DIR, prefix + '.md');
  fs.writeFileSync(markdownOutputPath, markdownContent, 'utf-8');
  console.log('✅ Markdown 文件已保存: ' + markdownOutputPath);

}

// ======================== 命令行入口 ========================

if (require.main === module) {
  const customJsonPath = process.argv[2];
  const outputPrefix = process.argv[3] || 'batch-compare';
  generateBatchMd(customJsonPath, outputPrefix).catch(error => {
    console.error('❌ 生成失败:', error.message);
    process.exit(1);
  });
}

module.exports = {
  generateMarkdown,
  generateBatchMd,
};
