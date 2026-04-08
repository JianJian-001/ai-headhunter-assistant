from datetime import date, datetime, timedelta
from typing import Any


CHANNEL_ALIASES = {
    "电话": "phone",
    "phone": "phone",
    "微信": "wechat",
    "wechat": "wechat",
    "短信": "sms",
    "sms": "sms",
    "邮件": "email",
    "email": "email",
    "脉脉": "maimai",
    "maimai": "maimai",
    "领英": "linkedin",
    "linkedin": "linkedin",
}

SENIORITY_ALIASES = {
    "senior": "senior",
    "高级": "senior",
    "资深": "senior",
    "director": "director",
    "总监": "director",
    "vp": "vp",
    "副总裁": "vp",
    "cxo": "cxo",
    "高管": "cxo",
}

INTEREST_LEVEL_ALIASES = {
    "hot": "热",
    "warm": "温",
    "cold": "冷",
    "热": "热",
    "温": "温",
    "冷": "冷",
}

RISK_LEVEL_ALIASES = {
    "high": "高",
    "medium": "中",
    "low": "低",
    "高": "高",
    "中": "中",
    "低": "低",
}

DEFAULT_OUTREACH_STEPS = [
    {"name": "首触", "offset_days": 0, "goal": "建立联系", "content_focus": "简要说明机会"},
    {"name": "跟进1", "offset_days": 5, "goal": "提醒看见", "content_focus": "轻量提醒，降低回复成本"},
    {"name": "跟进2", "offset_days": 10, "goal": "补充新价值", "content_focus": "团队亮点、业务背景或薪酬信息"},
    {"name": "收尾", "offset_days": 20, "goal": "礼貌收口", "content_focus": "保留未来再联系空间"},
]


def normalize_text(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def normalize_channels(raw_channels: list[Any]) -> list[str]:
    normalized_channels: list[str] = []
    seen_channels: set[str] = set()
    for raw_channel in raw_channels:
        channel_key = normalize_text(raw_channel).lower()
        normalized_channel = CHANNEL_ALIASES.get(channel_key) or CHANNEL_ALIASES.get(normalize_text(raw_channel))
        if normalized_channel and normalized_channel not in seen_channels:
            normalized_channels.append(normalized_channel)
            seen_channels.add(normalized_channel)
    return normalized_channels


def normalize_enum(value: Any, aliases: dict[str, str], default: str) -> str:
    normalized_value = normalize_text(value).lower()
    return aliases.get(normalized_value, aliases.get(normalize_text(value), default))


def select_outreach_channels(payload: dict[str, Any]) -> dict[str, Any]:
    available_channels = normalize_channels(payload.get("available_channels", []))
    seniority = normalize_enum(payload.get("seniority"), SENIORITY_ALIASES, "")
    urgent = bool(payload.get("urgent", False))
    has_referral = bool(payload.get("has_referral", False))

    if not available_channels:
        raise ValueError("available_channels 不能为空，且必须使用支持的渠道名称")

    scores = {channel: 0 for channel in available_channels}
    for channel in available_channels:
        if channel == "phone":
            if urgent:
                scores[channel] += 3
            if seniority in {"senior", "director", "vp", "cxo"}:
                scores[channel] += 2
            if has_referral:
                scores[channel] += 2
        elif channel == "wechat":
            scores[channel] += 3
            if has_referral:
                scores[channel] += 1
        elif channel == "sms":
            scores[channel] += 1
            if urgent:
                scores[channel] += 1
        elif channel in {"maimai", "linkedin"}:
            scores[channel] += 2
        elif channel == "email":
            scores[channel] += 2

    ranked_channels = sorted(scores.items(), key=lambda item: item[1], reverse=True)
    recommended_channels = [channel for channel, score in ranked_channels if score > 0] or [ranked_channels[0][0]]
    fallback_channels = [channel for channel in available_channels if channel not in recommended_channels]

    reasons = [f"首选渠道为 {recommended_channels[0]}，基于候选人画像和触达时效综合判断。"]
    if urgent and "phone" in available_channels:
        reasons.append("岗位紧急，电话更适合快速建立联系。")
    if "wechat" in available_channels:
        reasons.append("微信适合承接后续持续沟通。")

    return {
        "recommended_channels": recommended_channels,
        "fallback_channels": fallback_channels,
        "reasons": reasons,
        "supported_channels": sorted(set(CHANNEL_ALIASES.values())),
    }


def parse_date(raw_value: Any, field_name: str) -> date:
    text = normalize_text(raw_value)
    if not text:
        return datetime.now().date()
    try:
        return datetime.strptime(text, "%Y-%m-%d").date()
    except ValueError as error:
        raise ValueError(f"{field_name} 必须是 YYYY-MM-DD 格式") from error


def build_outreach_sequence(payload: dict[str, Any]) -> dict[str, Any]:
    start_date = parse_date(payload.get("start_date"), "start_date")
    preferred_channel_values = normalize_channels([payload.get("preferred_channel") or "wechat"])
    preferred_channel = preferred_channel_values[0] if preferred_channel_values else "wechat"
    sequence = []
    for step in DEFAULT_OUTREACH_STEPS:
        scheduled_date = start_date + timedelta(days=step["offset_days"])
        sequence.append(
            {
                "step": step["name"],
                "date": scheduled_date.isoformat(),
                "goal": step["goal"],
                "channel": preferred_channel,
                "content_focus": step["content_focus"],
            }
        )
    return {"start_date": start_date.isoformat(), "sequence": sequence}


def score_candidate_interest(payload: dict[str, Any]) -> dict[str, Any]:
    reply_speed = normalize_text(payload.get("reply_speed") or "slow").lower()
    asks_questions = bool(payload.get("asks_questions", False))
    confirms_next_step = bool(payload.get("confirms_next_step", False))
    delays_repeatedly = bool(payload.get("delays_repeatedly", False))
    mentions_other_offers = bool(payload.get("mentions_other_offers", False))

    score = 0
    if reply_speed == "fast":
        score += 3
    elif reply_speed == "normal":
        score += 1
    if asks_questions:
        score += 2
    if confirms_next_step:
        score += 2
    if delays_repeatedly:
        score -= 2
    if mentions_other_offers:
        score -= 1

    if score >= 5:
        interest_level = "热"
    elif score >= 2:
        interest_level = "温"
    else:
        interest_level = "冷"
    return {"score": score, "interest_level": interest_level}


def plan_candidate_next_action(payload: dict[str, Any]) -> dict[str, Any]:
    stage = normalize_text(payload.get("stage") or "初步沟通").replace(" ", "")
    interest_level = normalize_enum(payload.get("interest_level") or "温", INTEREST_LEVEL_ALIASES, "温")
    risk_level = normalize_enum(payload.get("risk_level") or "中", RISK_LEVEL_ALIASES, "中")
    try:
        days_since_last_contact = int(payload.get("days_since_last_contact", 0))
    except (TypeError, ValueError) as error:
        raise ValueError("days_since_last_contact 必须是整数") from error

    if risk_level == "高":
        action = "优先安抚并确认顾虑"
        due = "当天"
    elif stage in {"面试后", "Offer前后"} and interest_level in {"热", "温"}:
        action = "围绕当前节点推进关键决策"
        due = "24小时内"
    elif stage in {"初步沟通", "深入沟通"} and interest_level == "热":
        action = "推动进入下一节点"
        due = "24小时内"
    elif days_since_last_contact >= 5:
        action = "做一次轻量价值型跟进"
        due = "当天"
    else:
        action = "保持节奏，按阶段跟进"
        due = "1-3天内"

    return {"stage": stage, "recommended_action": action, "recommended_due": due}


def score_client_tier(payload: dict[str, Any]) -> dict[str, Any]:
    try:
        annual_revenue = float(payload.get("annual_revenue", 0))
        active_roles = int(payload.get("active_roles", 0))
        successful_placements = int(payload.get("successful_placements", 0))
    except (TypeError, ValueError) as error:
        raise ValueError("annual_revenue、active_roles、successful_placements 必须是数字") from error

    response_speed = normalize_text(payload.get("response_speed") or "slow").lower()
    strategic_value = bool(payload.get("strategic_value", False))

    score = 0
    if annual_revenue >= 500000:
        score += 3
    elif annual_revenue >= 100000:
        score += 2
    elif annual_revenue > 0:
        score += 1

    if active_roles >= 5:
        score += 3
    elif active_roles >= 2:
        score += 2
    elif active_roles == 1:
        score += 1

    if successful_placements >= 3:
        score += 2
    elif successful_placements >= 1:
        score += 1

    if response_speed == "fast":
        score += 2
    elif response_speed == "normal":
        score += 1

    if strategic_value:
        score += 2

    if score >= 9:
        tier = "战略客户"
    elif score >= 5:
        tier = "核心客户"
    else:
        tier = "普通客户"
    return {"score": score, "tier": tier}


def schedule_client_touchpoint(payload: dict[str, Any]) -> dict[str, Any]:
    tier = normalize_text(payload.get("tier") or "普通客户")
    lifecycle_stage = normalize_text(payload.get("lifecycle_stage") or "合作中")
    has_new_signal = bool(payload.get("has_new_signal", False))
    risk_level = normalize_text(payload.get("risk_level") or "中")
    base_date = parse_date(payload.get("last_contact_date"), "last_contact_date")

    if risk_level == "高":
        due_days = 0
        action = "优先联系，处理风险和沉默问题"
    elif has_new_signal:
        due_days = 1
        action = "围绕新需求信号快速切入沟通"
    elif tier == "战略客户":
        due_days = 7
        action = "做高质量关系维护并挖掘新需求"
    elif tier == "核心客户":
        due_days = 14
        action = "保持稳定联系，确认续单机会"
    else:
        due_days = 30
        action = "做轻量维护，关注关键窗口"

    if lifecycle_stage == "项目交付后":
        agenda = "复盘本次交付，衔接续单和新岗位机会"
    elif lifecycle_stage == "合作中":
        agenda = "跟进项目进展，顺势挖掘新需求"
    else:
        agenda = "重新激活关系，确认最新组织变化"

    return {
        "recommended_action": action,
        "recommended_date": (base_date + timedelta(days=due_days)).isoformat(),
        "agenda": agenda,
    }
