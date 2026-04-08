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
const { generateBatchMd } = require('./genbatchpic');
const { v4: uuidv4, v1: uuidv1, v5: uuidv5 } = require('uuid');

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
      resume_channel: 'Bello',
      file_name: getFileName(resumePath),
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
    const url = 'https://construction-ai.dingtalk.com/hire/skill/matchResumeForBatchOpc';
  
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
    //console.log('🚀 简历解析结果', resumeContentData);
    console.log('🚀 完成解析简历', filePath);

    console.log('🚀 开始简历职位匹配', filePath);
    // console.log('🚀 简历职位匹配可能会耗时较长，请耐心等待一下，当前匹配简历文件：', filePath);
    const llmResult = await matchResume(JSON.parse(resumeContentData), jobContentData);
    //console.log('🚀 简历职位匹配结果', llmResult);
    console.log('🚀 完成简历职位匹配', filePath);

    return llmResult;
  } catch (error) {
    console.log('🚀 简历职位匹配有一个文件异常，filePath:', filePath);
    // console.error('发生错误：'+ filePath, error);
    return null;
  }
}


// ======================== 简历文件列举 ========================

const RESUME_EXTENSIONS = new Set(['.pdf', '.doc', '.docx']);

async function listResumeFiles(fileDirPath) {
  if (!fs.existsSync(fileDirPath)) {
    console.error('目录不存在：' + fileDirPath);
    return [];
  }

  const entries = fs.readdirSync(fileDirPath);
  const resumeFiles = entries.filter(fileName => {
    const extension = path.extname(fileName).toLowerCase();
    return RESUME_EXTENSIONS.has(extension);
  });

  return resumeFiles.map(fileName => path.join(fileDirPath, fileName));
}

// ======================== 命令行入口 ========================

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log('Usage: node main.js file_path job_content_data');
    console.log('  file_dir_path:         简历文件夹');
    console.log('  job_content_data:  职位要求描述内容');
    process.exit(1);
  }

  const file_dir_path = args[0];
  const jobContentData = args[1];

  const resumeFiles = await listResumeFiles(file_dir_path);
  if (resumeFiles.length === 0) {
    console.error('简历文件不存在');
    process.exit(1);
  }

  const CONCURRENCY_LIMIT = 3;
  const itemList = [];
  for (let i = 0; i < resumeFiles.length; i += CONCURRENCY_LIMIT) {
    const batch = resumeFiles.slice(i, i + CONCURRENCY_LIMIT);
    const batchResults = await Promise.all(
      batch.map(filePath => mainForFile(filePath, jobContentData).catch(error => {
        console.error('处理简历失败：' + filePath, error.message);
        return null;
      }))
    );
    for (const item of batchResults) {
      if (item == null) continue;
      itemList.push(typeof item === 'string' ? JSON.parse(item) : item);
    }
  }
  
  const outputDir = path.join(__dirname, 'output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  const uuid = uuidv4();
  const fileFullPath = path.join(outputDir, 'batch-result'+uuid+'.json');
  writeToFile(fileFullPath, JSON.stringify(itemList, null, 2));
  console.log('匹配结果结果已保存至：' + fileFullPath);

  generateBatchMd(fileFullPath, 'batch-compare'+uuid);

}

function writeToFile(filePath, itemList) {
  fs.writeFileSync(filePath, itemList, 'utf-8');
}

async function mainForFile(filePath, jobContentData) { 
  if (!fs.existsSync(filePath)) {
    console.error('文件不存在：' + filePath);
    process.exit(1);
  }

  const result = await llmExecuteMatch(filePath, jobContentData);

  return result;
}

main().catch((error) => {
  console.error('执行失败：' + error.message);
  process.exit(1);
});

module.exports = {
  llmExecuteMatch,
  parseResumeFile,
};
