# 招聘网站速查表

## 第三方招聘平台

| 平台 | 搜索URL模板 | 说明 |
|------|------------|------|
| BOSS直聘 | `https://www.zhipin.com/web/geek/job?query={关键词}` | 综合招聘，按公司/岗位/城市搜索 |
| 猎聘 | `https://www.liepin.com/zhaopin/?key={关键词}` | 中高端招聘 |

---

## 企业官方招聘网站

### 互联网 / AI

| 公司 | 招聘官网 |
|------|---------|
| 字节跳动 | https://jobs.bytedance.com/experienced/position |
| 腾讯 | https://careers.tencent.com/jobopportunity.html |
| 阿里巴巴 | https://talent-holding.alibaba.com/off-campus/position-list?lang=zh|
| 蚂蚁集团 | https://talent.antgroup.com |
| 百度 | https://talent.baidu.com/jobs/social-list |
| 美团 | https://zhaopin.meituan.com/web/social |
| 京东 | https://zhaopin.jd.com/web/job/job_info_list/3 |
| 快手 | https://zhaopin.kuaishou.cn |
| 小红书 | https://job.xiaohongshu.com/social/position |
| 拼多多 | https://careers.pddglobalhr.com/jobs |
| 网易 | https://hr.163.com/job-list.html |
| 哔哩哔哩 | https://jobs.bilibili.com/social/positions |
| 滴滴 | https://talent.didiglobal.com/social/list/1 |

### 消费电子 / 硬件

| 公司 | 招聘官网 |
|------|---------|
| 华为 | https://career.huawei.com |
| 小米 | https://hr.mi.com |
| 联想 | https://talent.lenovo.com.cn |
| 中兴 | https://zte.zhaopin.com |
| 海康威视 | https://talent.hikvision.com/society/index |
| 大华 | https://job.dahuatech.com |

### 新能源汽车

| 公司 | 招聘官网 |
|------|---------|
| 理想 | https://www.lixiang.com/employ/social.html |
| 小鹏 | https://www.xiaopeng.com/join.html |
| 蔚来 | https://www.nio.cn/careers |
| 比亚迪 | https://job.byd.com |

### 半导体 / 芯片

| 公司 | 招聘官网 |
|------|---------|
| 长江存储 | https://ymtc.zhiye.com/social/jobs |
| 京东方 | https://boe.zhiye.com |
| 寒武纪 | https://app.mokahr.com/apply/cambricon |

---

## URL查找策略

公司不在列表中时：

```
1. 尝试常见URL模式：
   - talent.{公司域名}.com
   - careers.{公司域名}.com
   - jobs.{公司域名}.com
   - {公司域名}/careers
   - {公司域名}/jobs

2. 搜索引擎查找：
   "{公司名称} 招聘官网"
   
3. 识别官方域名：
   - 排除第三方招聘平台链接
   - 寻找包含 talent/career/join/zhaopin 的URL
```

## 常见URL后缀

| 类型 | 常见后缀 |
|------|---------|
| 社招 | `/social`, `/experienced`, `/off-campus` |
| 校招 | `/campus`, `/fresh`, `/graduate` |
| 岗位列表 | `/position-list`, `/jobs`, `/job-list` |
