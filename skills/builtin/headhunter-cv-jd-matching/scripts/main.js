#!/usr/bin/env node
/**
 * 候选人简历与职位匹配、简历疑点识别、面试辅助问答 - Node.js 版本
 *
 * Usage:
 *   node main.js file_path job_content_data
 *
 * Output:
 *   a json string containing match result, suspicious points, and interview insights
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const OpenAI = require('openai');
const puppeteer = require('puppeteer');

const OUTPUT_DIR = path.join(__dirname, 'output');

// ======================== 简历文件解析 ========================

function getFileSuffix(filePath) {
  return filePath.split('.').pop();
}

function getFileName(filePath) {
  return path.basename(filePath);
}
async function parseResumeFile(resumePath) {
  
  const fileBuffer = fs.readFileSync(resumePath);
  const encodedString = fileBuffer.toString('base64');

  const payload = {
    file_name: getFileName(resumePath),
    resume_channel: 'Bello',
      file_base64_string: encodedString,
  };

  // console.log('🚀 ~ file: genbatchpic.js ~ line 27 ~ payload=', JSON.stringify(payload));
  const url = 'https://construction-ai.dingtalk.com/hire/skill/parseResumeFile';

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  // console.log('🚀 ~ file: genbatchpic.js ~ line 27 ~ response=', response);

  const responseData = await response.json();
  return JSON.stringify(responseData, null, 2);
}

// ======================== LLM 调用 ========================

async function matchResume(resumeContentData, jobContentData) { 

    const payload = {
        resume_content_data: resumeContentData,
        job_content_data: jobContentData,
    };
    const url = 'https://construction-ai.dingtalk.com/hire/skill/matchResume';
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  // console.log('🚀 ~ fun: matchResume ~ response', response);

  const responseData = await response.json();
  return JSON.stringify(responseData, null, 2);
}

async function llmExecuteMatch(filePath, jobContentData) {
  try {
    if (!filePath) {
      return '请指定简历文件路径。';
    }

    console.log('🚀 开始解析简历', filePath);
    const resumeContentData = await parseResumeFile(filePath);
    console.log('🚀 完成解析简历', filePath);

    console.log('🚀 开始简历职位匹配', filePath);
    console.log('🚀 简历职位匹配可能会耗时较长，请耐心等待一下，当前匹配简历文件：', filePath);
    const llmResult = await matchResume(JSON.parse(resumeContentData), jobContentData);
    console.log('🚀 完成简历职位匹配', filePath);

    return llmResult;
  } catch (error) {
    return '发生错误：' + error.message;
  }
}

// ======================== 图片生成 ========================

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

function buildHtml(data) {
  const matchResult = data.hireAiResumeMatchJobResultVO;
  const suspiciousPoints = data.resumeSuspiciousPointList || [];
  const interviewInsights = data.interviewInsightVOList || [];

  const scoreColor = getScoreColor(matchResult.matchScore);
  const scoreLabel = getScoreLabel(matchResult.matchScore);

  const dimensionsHtml = matchResult.dimensions.map(dimension => {
    const barColor = getDimensionBarColor(dimension.score);
    const barWidth = dimension.score/dimension.maxScore * 100;
    return `
      <div class="dimension-item">
        <div class="dimension-header">
          <span class="dimension-name">${dimension.evaluation}</span>
          <span class="dimension-score" style="color: ${barColor}">${dimension.score}/${dimension.maxScore}</span>
        </div>
        <div class="dimension-bar-bg">
          <div class="dimension-bar" style="width: ${barWidth}%; background: ${barColor}"></div>
        </div>
        <div class="dimension-desc">${dimension.description}</div>
      </div>`;
  }).join('');

  const advantagesHtml = matchResult.advantageDesc.map(item =>
    `<li class="advantage-item"><span class="icon">✅</span>${item}</li>`
  ).join('');

  const disadvantagesHtml = matchResult.disadvantageDesc.map(item =>
    `<li class="disadvantage-item"><span class="icon">⚠️</span>${item}</li>`
  ).join('');

  const suspiciousHtml = suspiciousPoints.map((point, index) =>
    `<div class="suspicious-card">
      <div class="suspicious-title"><span class="suspicious-index">${index + 1}</span>${point.point}</div>
      <div class="suspicious-reason">${point.reason}</div>
    </div>`
  ).join('');

  const interviewHtml = interviewInsights.map((insight, index) =>
    `<div class="interview-card">
      <div class="interview-header">
        <span class="interview-index">${index + 1}</span>
        <span class="interview-point">${insight.assessmentPoint}</span>
      </div>
      <div class="interview-section">
        <div class="interview-label">💬 建议问题</div>
        <div class="interview-content">${insight.suggestedQuestion}</div>
      </div>
      <div class="interview-section">
        <div class="interview-label">💡 回答洞察</div>
        <div class="interview-content insight-content">${insight.responseInsights}</div>
      </div>
    </div>`
  ).join('');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${matchResult.name}的简历匹配分析报告</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 32px;
      min-height: 100vh;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 32px 40px;
      color: white;
      text-align: center;
    }
    .header h1 {
      font-size: 24px;
      font-weight: 600;
      margin-bottom: 8px;
      letter-spacing: 2px;
    }
    .header .subtitle {
      font-size: 14px;
      opacity: 0.85;
    }
    .score-section {
      display: flex;
      align-items: center;
      padding: 32px 40px;
      border-bottom: 1px solid #f0f0f0;
    }
    .score-circle {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      border: 6px solid ${scoreColor};
      flex-shrink: 0;
      position: relative;
    }
    .score-circle::before {
      content: '';
      position: absolute;
      width: 130px;
      height: 130px;
      border-radius: 50%;
      border: 2px solid ${scoreColor}20;
    }
    .score-number {
      font-size: 42px;
      font-weight: 700;
      color: ${scoreColor};
      line-height: 1;
    }
    .score-label {
      font-size: 14px;
      color: ${scoreColor};
      margin-top: 4px;
      font-weight: 500;
    }
    .score-summary {
      margin-left: 32px;
      flex: 1;
    }
    .score-summary .summary-title {
      font-size: 16px;
      font-weight: 600;
      color: #1a1a1a;
      margin-bottom: 10px;
    }
    .score-summary .summary-text {
      font-size: 14px;
      color: #666;
      line-height: 1.8;
    }
    .section {
      padding: 28px 40px;
      border-bottom: 1px solid #f0f0f0;
    }
    .section:last-child {
      border-bottom: none;
    }
    .section-title {
      font-size: 18px;
      font-weight: 600;
      color: #1a1a1a;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .section-title .title-icon {
      width: 4px;
      height: 20px;
      border-radius: 2px;
      background: linear-gradient(135deg, #667eea, #764ba2);
    }
    .dimension-item { margin-bottom: 16px; }
    .dimension-item:last-child { margin-bottom: 0; }
    .dimension-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }
    .dimension-name { font-size: 14px; font-weight: 500; color: #333; }
    .dimension-score { font-size: 14px; font-weight: 600; }
    .dimension-bar-bg {
      height: 8px;
      background: #f0f0f0;
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 6px;
    }
    .dimension-bar { height: 100%; border-radius: 4px; transition: width 0.6s ease; }
    .dimension-desc { font-size: 12px; color: #999; line-height: 1.6; }
    .pros-cons { display: flex; gap: 24px; }
    .pros-col, .cons-col { flex: 1; }
    .col-title {
      font-size: 15px;
      font-weight: 600;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 2px solid;
    }
    .pros-col .col-title { color: #52c41a; border-color: #52c41a; }
    .cons-col .col-title { color: #f5222d; border-color: #f5222d; }
    .pros-cons ul { list-style: none; }
    .pros-cons li {
      font-size: 13px;
      color: #555;
      line-height: 1.7;
      margin-bottom: 8px;
      display: flex;
      align-items: flex-start;
      gap: 6px;
    }
    .pros-cons li .icon { flex-shrink: 0; margin-top: 1px; }
    .suspicious-card {
      background: #fffbe6;
      border: 1px solid #ffe58f;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 12px;
    }
    .suspicious-card:last-child { margin-bottom: 0; }
    .suspicious-title {
      font-size: 14px;
      font-weight: 600;
      color: #d48806;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .suspicious-index {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: #faad14;
      color: white;
      font-size: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .suspicious-reason {
      font-size: 13px;
      color: #8c6d1f;
      line-height: 1.7;
      padding-left: 30px;
    }
    .interview-card {
      background: #f6ffed;
      border: 1px solid #b7eb8f;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 12px;
    }
    .interview-card:last-child { margin-bottom: 0; }
    .interview-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
    }
    .interview-index {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: #52c41a;
      color: white;
      font-size: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .interview-point { font-size: 15px; font-weight: 600; color: #389e0d; }
    .interview-section { margin-bottom: 10px; padding-left: 30px; }
    .interview-section:last-child { margin-bottom: 0; }
    .interview-label { font-size: 13px; font-weight: 600; color: #555; margin-bottom: 4px; }
    .interview-content { font-size: 13px; color: #666; line-height: 1.7; }
    .insight-content {
      background: #e6fffb;
      border-radius: 6px;
      padding: 10px 12px;
      border-left: 3px solid #13c2c2;
    }
    .footer {
      text-align: center;
      padding: 16px 40px;
      color: #bbb;
      font-size: 12px;
      border-top: 1px solid #f0f0f0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📋 ${matchResult.name}的简历匹配分析报告</h1>
      <div class="subtitle">Resume-Job Match Analysis Report</div>
    </div>
    <div class="score-section">
      <div class="score-circle">
        <div class="score-number">${matchResult.matchScore}</div>
        <div class="score-label">${scoreLabel}</div>
      </div>
      <div class="score-summary">
        <div class="summary-title">匹配总结</div>
        <div class="summary-text">${matchResult.summary}</div>
      </div>
    </div>
    <div class="section">
      <div class="section-title"><span class="title-icon"></span>维度评分</div>
      ${dimensionsHtml}
    </div>
    <div class="section">
      <div class="section-title"><span class="title-icon"></span>优劣势分析</div>
      <div class="pros-cons">
        <div class="pros-col">
          <div class="col-title">✅ 优势</div>
          <ul>${advantagesHtml}</ul>
        </div>
        <div class="cons-col">
          <div class="col-title">⚠️ 劣势</div>
          <ul>${disadvantagesHtml}</ul>
        </div>
      </div>
    </div>
    <div class="section">
      <div class="section-title"><span class="title-icon"></span>🔍 简历疑点</div>
      ${suspiciousHtml || '<div style="color: #999; font-size: 14px;">暂无简历疑点</div>'}
    </div>
    <div class="section">
      <div class="section-title"><span class="title-icon"></span>💡 面试建议题目</div>
      ${interviewHtml || '<div style="color: #999; font-size: 14px;">暂无面试建议</div>'}
    </div>
    <div class="footer">
      由 AI 智能分析生成 · 仅供参考
    </div>
  </div>
</body>
</html>`;
}

async function generatePicture(jsonFilePath, outputPrefix) {
  if (!fs.existsSync(jsonFilePath)) {
    console.error('❌ JSON 文件不存在: ' + jsonFilePath);
    return;
  }

  const rawData = fs.readFileSync(jsonFilePath, 'utf-8');
  const data = JSON.parse(rawData);
  console.log('✅ 成功读取 JSON 数据');

  const htmlContent = buildHtml(data);
  console.log('✅ 成功生成 HTML 内容');

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const htmlOutputPath = path.join(OUTPUT_DIR, outputPrefix + 'match.html');
  fs.writeFileSync(htmlOutputPath, htmlContent, 'utf-8');
  //console.log('✅ HTML 文件已保存: ' + getRelatedPath(htmlOutputPath));
  console.log('✅ HTML 文件已保存: ' + htmlOutputPath);

  /*

  console.log('🚀 正在启动浏览器生成图片...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 900, height: 800, deviceScaleFactor: 2 });
  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

  const containerElement = await page.$('.container');
  const boundingBox = await containerElement.boundingBox();

  const pngOutputPath = path.join(OUTPUT_DIR, outputPrefix + 'match.png');
  await page.screenshot({
    path: pngOutputPath,
    clip: {
      x: boundingBox.x,
      y: boundingBox.y,
      width: boundingBox.width,
      height: boundingBox.height,
    },
    omitBackground: true,
  });

  await browser.close();
  console.log('✅ 图片已保存: ' + pngOutputPath);
  */
  console.log('全部结果完成，markdown消息格式如下，请你返回该markdown内容给用户： ');
  console.log('```markdown');
console.log('# 简历匹配分析报告信息如下');
//console.log('![简历匹配分析报告]('+pngOutputPath+')');

console.log('[点击查看简历匹配分析报告]('+htmlOutputPath+')');
console.log('```');

}

// ======================== 命令行入口 ========================

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log('Usage: node main.js file_path job_content_data');
    console.log('  file_path:         简历文件路径');
    console.log('  job_content_data:  职位要求描述内容');
    process.exit(1);
  }

  const filePath = args[0];
  const jobContentData = args[1];

  if (!fs.existsSync(filePath)) {
    console.error('文件不存在：' + filePath);
    process.exit(1);
  }

  const result = await llmExecuteMatch(filePath, jobContentData);
  // console.log(result);

  const outputDir = path.join(__dirname, 'output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  const filePathHash = crypto.createHash('md5').update(filePath).digest('hex');
  const outputFilePath = path.join(outputDir, `${filePathHash}.json`);
  fs.writeFileSync(outputFilePath, result, 'utf-8');
  //console.log('中间结果已保存至：' + outputFilePath);

  await generatePicture(outputFilePath, filePathHash + '-');
  console.log('🎉 全部完成！');
}

main().catch((error) => {
  console.error('执行失败：' + error.message);
  process.exit(1);
});

module.exports = {
  llmExecuteMatch,
  parseResumeFile,
  buildHtml,
  generatePicture,
};
