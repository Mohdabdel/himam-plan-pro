"""
Silent Engine — محرك معايرة بروفايل المتعلم
منصة همم | الإصدار 1.0

المدخل:  بروفايل خام (JSON) يحتوي الحافظات السبع
المخرج: بروفايل مُعاير — كل مفهوم فيه:
        current_level, coverage, confidence,
        evidence_summary, conflicts, completion_recommendation
"""

import json
import copy
from pathlib import Path
from typing import Optional

# ─────────────────────────────────────────────
# 1. جداول الترجيح — من مواصفة المعايرة القسم 7.3
# ─────────────────────────────────────────────

SOURCE_TYPE_WEIGHTS = {
    "formal_tool":            3,
    "functional_observation": 3,
    "family_voice":           2,
    "learner_voice":          2,
    "team_report":            2,
    "informal_tool":          2,
    "file_review":            1,
}

CONTEXT_STRENGTH_WEIGHTS = {
    "natural_with_routine": 3,   # بيئة طبيعية + روتين
    "natural_no_routine":   2,   # بيئة طبيعية بدون روتين محدد
    "structured":           1,   # بيئة منظمة (مركز/اختبار)
    "no_context":           0,
}

REPETITION_WEIGHTS = {
    "multi_source_multi_time": 2,
    "confirmed_twice":         1,
    "single_observation":      0,
}

RELEVANCE_WEIGHTS = {
    "direct":   3,
    "indirect": 1,
}

INDEPENDENCE_WEIGHTS = {
    "none":              3,
    "minimal_reminder":  2,
    "moderate":          1,
    "intensive":         0,
    "unknown":           1,
}

# ─────────────────────────────────────────────
# 2. تعريفات المستويات الوصفية — القسم 7.1
# ─────────────────────────────────────────────

LEVEL_DESCRIPTORS = {
    1: "لا يظهر الأداء أو يظهر فقط بتجزئة/تلقين كثيف وفي سياق محدود جداً",
    2: "يظهر الأداء بشكل ناشئ مع دعم واضح وفي مواقف مألوفة",
    3: "يظهر الأداء جزئياً وبثبات متوسط مع دعم متوسط وفي أكثر من موقف قريب",
    4: "يظهر الأداء بشكل وظيفي في مواقف مألوفة مع دعم خفيف أو تذكير",
    5: "يظهر الأداء باستقلال جيد في أكثر من بيئة مع تعميم مقبول",
    6: "يظهر الأداء باستقلال وثبات وتعميم واضح مع قدرة على التكيف",
}

# ─────────────────────────────────────────────
# 3. ربط الأداة بالمفاهيم — جدول القسم 8
# ─────────────────────────────────────────────

TOOL_CONCEPT_MAP = {
    # formal tools
    "TTAP-3":        ["SAFETY","SELF_DET","COMM","SELF_CARE","MOBILITY","SOCIAL","COMMUNITY","HEALTH","ACADEMIC","LEARNING_TECH"],
    "Vineland-3":    ["COMM","SELF_CARE","MOBILITY","SOCIAL","HEALTH","ACADEMIC"],
    "AEPS-3":        ["COMM","SELF_CARE","MOBILITY","SOCIAL","ACADEMIC"],
    # informal / interviews
    "استمارة صوت المتعلم":  ["SELF_DET","COMM","SOCIAL","COMMUNITY","SELF_CARE","MOBILITY","SAFETY","HEALTH"],
    "استمارة صوت الأسرة":   ["SAFETY","SELF_DET","COMM","SELF_CARE","MOBILITY","SOCIAL","COMMUNITY","HEALTH","ACADEMIC"],
    "ملاحظة وظيفية":        ["SAFETY","COMM","SELF_CARE","MOBILITY","SOCIAL","COMMUNITY","HEALTH","ACADEMIC","LEARNING_TECH"],
    "قائمة مهارات حياة":    ["SELF_CARE","MOBILITY","HEALTH","ACADEMIC","LEARNING_TECH"],
    "أداة تقرير مصير":      ["SELF_DET","COMM","SOCIAL","COMMUNITY"],
    "أداة ميول مهنية":      ["SELF_DET","COMMUNITY","ACADEMIC","LEARNING_TECH"],
    "تحليل بيئي":           ["MOBILITY","COMMUNITY","SAFETY","SELF_CARE"],
}

# ─────────────────────────────────────────────
# 4. دوال حساب الأوزان
# ─────────────────────────────────────────────

def _score_source_type(source_ref: dict) -> int:
    return SOURCE_TYPE_WEIGHTS.get(source_ref.get("source_type", ""), 1)


def _score_context(context: Optional[dict]) -> int:
    if not context:
        return 0
    env  = context.get("environment", "")
    rout = context.get("routine", "")
    if env in ("home", "community") and rout and rout != "other":
        return CONTEXT_STRENGTH_WEIGHTS["natural_with_routine"]
    if env in ("home", "community"):
        return CONTEXT_STRENGTH_WEIGHTS["natural_no_routine"]
    if env in ("center_school", "work"):
        return CONTEXT_STRENGTH_WEIGHTS["structured"]
    return CONTEXT_STRENGTH_WEIGHTS["no_context"]


def _score_repetition(evidence_list: list, ev: dict) -> int:
    """دليل واحد يُقيَّم في سياق قائمة الأدلة الكاملة للمفهوم."""
    src = ev.get("source_ref", {}).get("source_name", "")
    # هل هناك دليل آخر من مصدر مختلف يصف نفس النوع؟
    same_type_others = [
        e for e in evidence_list
        if e["evidence_id"] != ev["evidence_id"]
        and e.get("evidence_type") == ev.get("evidence_type")
        and e.get("source_ref", {}).get("source_name", "") != src
    ]
    if same_type_others:
        return REPETITION_WEIGHTS["multi_source_multi_time"]
    # دليلان من نفس المصدر؟
    same_src_others = [
        e for e in evidence_list
        if e["evidence_id"] != ev["evidence_id"]
        and e.get("source_ref", {}).get("source_name", "") == src
    ]
    if same_src_others:
        return REPETITION_WEIGHTS["confirmed_twice"]
    return REPETITION_WEIGHTS["single_observation"]


def _score_relevance(ev: dict, concept_id: str) -> int:
    """
    مباشر إذا وُجد في قائمة الأدلة مرتبطاً بالمفهوم أصلاً.
    بشكل مبسّط: كل أدلة الملف مباشرة.
    """
    return RELEVANCE_WEIGHTS["direct"]


def _score_independence(context: Optional[dict]) -> int:
    if not context:
        return INDEPENDENCE_WEIGHTS["unknown"]
    return INDEPENDENCE_WEIGHTS.get(
        context.get("support_present", "unknown"),
        INDEPENDENCE_WEIGHTS["unknown"]
    )


def compute_evidence_weights(evidence_list: list, concept_id: str) -> list:
    """يحسب الأوزان لكل دليل في القائمة ويُضيفها في weights."""
    result = []
    for ev in evidence_list:
        ev = copy.deepcopy(ev)
        ctx = ev.get("context")
        src = ev.get("source_ref", {})

        s1 = _score_source_type(src)
        s2 = _score_context(ctx)
        s3 = _score_repetition(evidence_list, ev)
        s4 = _score_relevance(ev, concept_id)
        s5 = _score_independence(ctx)
        total = s1 + s2 + s3 + s4 + s5

        ev["weights"] = {
            "source_type_score":     s1,
            "context_strength_score":s2,
            "repetition_score":      s3,
            "relevance_score":       s4,
            "independence_score":    s5,
            "total_weight":          total,
        }
        result.append(ev)
    return result


# ─────────────────────────────────────────────
# 5. حساب المستوى من الأدلة
# ─────────────────────────────────────────────

def derive_level(evidence_list: list) -> Optional[int]:
    """
    يشتق المستوى من الأدلة المُرجَّحة.
    المنطق:
      - يُحسب متوسط independence_score للأدلة القوية (total≥8)
      - مع مراعاة نوع الأدلة (strength رافع، need خافض)
    """
    if not evidence_list:
        return None

    strong = [e for e in evidence_list if e["weights"]["total_weight"] >= 8]
    if not strong:
        strong = evidence_list  # استخدم الكل إذا لا يوجد قوي

    strengths  = [e for e in strong if e.get("evidence_type") == "strength"]
    emerging   = [e for e in strong if e.get("evidence_type") == "emerging"]
    needs      = [e for e in strong if e.get("evidence_type") == "need"]

    # وزن الاستقلال لكل فئة
    def avg_ind(lst):
        if not lst: return 0
        return sum(e["weights"]["independence_score"] for e in lst) / len(lst)

    s_ind = avg_ind(strengths)
    e_ind = avg_ind(emerging)
    n_ind = avg_ind(needs)

    # صياغة المستوى
    if strengths and s_ind >= 2.5:
        if len({e.get("context",{}).get("environment","") for e in strengths}) >= 2:
            return 5  # استقلال في بيئتين+
        return 4      # استقلال في بيئة مألوفة
    elif strengths and s_ind >= 1.5:
        return 3      # ثابت مع دعم متوسط
    elif strengths or emerging:
        if e_ind >= 1:
            return 2  # ناشئ مع دعم
        return 2
    elif needs and not strengths:
        return 1      # لا يظهر أداء
    return 2          # افتراضي محافظ


# ─────────────────────────────────────────────
# 6. حساب Coverage وConfidence
# ─────────────────────────────────────────────

def compute_coverage(evidence_list: list, tools_coverage: list, concept_id: str) -> str:
    """
    good:     3+ مصادر + بيئتان+ + دليل مباشر
    moderate: مصدران + بيئة + بعض السياق
    limited:  مصدر واحد أو بيانات عامة
    """
    sources = {e.get("source_ref",{}).get("source_type","") for e in evidence_list}
    envs    = {e.get("context",{}).get("environment","") for e in evidence_list if e.get("context")}
    has_direct = any(e.get("evidence_type") in ("strength","emerging","need") for e in evidence_list)

    if len(sources) >= 3 and len(envs) >= 2 and has_direct:
        return "good"
    if len(sources) >= 2 and len(envs) >= 1:
        return "moderate"
    return "limited"


def compute_confidence(evidence_list: list, conflicts: list) -> str:
    """
    high:   أدلة قوية متقاربة من مصادر متعددة
    medium: أدلة معقولة أو بعض التعارض
    low:    دليل ضعيف أو تعارض كبير
    """
    if not evidence_list:
        return "low"

    strong_count = sum(1 for e in evidence_list if e["weights"]["total_weight"] >= 8)
    conflict_count = len(conflicts)

    if conflict_count >= 2:
        return "low"
    if strong_count >= 3 and conflict_count == 0:
        return "high"
    if strong_count >= 1:
        return "medium"
    return "low"


# ─────────────────────────────────────────────
# 7. رصد التعارضات
# ─────────────────────────────────────────────

def detect_conflicts(evidence_list: list) -> list:
    """
    يرصد التعارض بين البيئات أو المصادر على نفس نوع الأداء.
    """
    conflicts = []
    # تعارض بيئي: قوة في بيئة + حاجة في بيئة أخرى
    strength_envs = {
        e.get("context",{}).get("environment","")
        for e in evidence_list
        if e.get("evidence_type") == "strength" and e.get("context")
    }
    need_envs = {
        e.get("context",{}).get("environment","")
        for e in evidence_list
        if e.get("evidence_type") == "need" and e.get("context")
    }
    overlap = strength_envs & need_envs

    if strength_envs and need_envs and not overlap:
        conflicts.append({
            "conflict_id": "CONF-ENV-001",
            "description_ar": f"الأداء يظهر قوياً في {strength_envs} لكن يُسجَّل كحاجة في {need_envs}",
            "between_sources": list(strength_envs | need_envs),
            "interpretation_ar": "التباين بيئي — الأداء حقيقي في البيئة المألوفة ولم ينتقل للبيئة الأخرى بعد. ليس تعارضاً في الأداء بل فرق سياقي."
        })

    # تعارض بين مصدرين على نفس النوع
    source_types = [e.get("source_ref",{}).get("source_type","") for e in evidence_list]
    if "formal_tool" in source_types and "family_voice" in source_types:
        formal_evs  = [e for e in evidence_list if e.get("source_ref",{}).get("source_type")=="formal_tool"]
        family_evs  = [e for e in evidence_list if e.get("source_ref",{}).get("source_type")=="family_voice"]
        formal_types = {e.get("evidence_type") for e in formal_evs}
        family_types = {e.get("evidence_type") for e in family_evs}
        if "strength" in formal_types and "need" in family_types:
            conflicts.append({
                "conflict_id": "CONF-SRC-001",
                "description_ar": "الأداة الرسمية تُشير إلى قوة، بينما الأسرة تُسجّل حاجة في سياق آخر",
                "between_sources": ["formal_tool", "family_voice"],
                "interpretation_ar": "التباين محتمل — قد يكون الأداء في المركز (بيئة الأداة) أفضل من البيئة المنزلية. يستلزم ملاحظة وظيفية في البيت."
            })

    return conflicts


# ─────────────────────────────────────────────
# 8. توصيات الاستكمال
# ─────────────────────────────────────────────

COMPLETION_TOOL_MAP = {
    "single_source_only":               ("ملاحظة وظيفية مباشرة أو مقابلة مستقلة", "بيئة طبيعية"),
    "no_natural_environment_observation":("ملاحظة وظيفية في البيئة الطبيعية",       "home أو community"),
    "conflicting_evidence":             ("ملاحظة وظيفية مباشرة",                    "البيئة التي يظهر فيها التباين"),
    "no_support_data":                  ("مقابلة أسرة موجهة أو تحليل بيئي",         "home"),
    "voice_without_performance_data":   ("قائمة مهارات حياة يومية",                 "home أو center_school"),
    "high_level_weak_evidence":         ("أداة رسمية معيارية",                       "center_school"),
}

def generate_completion_recommendation(
    evidence_list: list,
    coverage: str,
    confidence: str,
    conflicts: list,
    concept_id: str
) -> Optional[dict]:
    """يُطلق توصية استكمال إذا تحقق أي شرط من شروط المادة الثانية عشرة."""

    sources = {e.get("source_ref",{}).get("source_type","") for e in evidence_list}
    has_natural_obs = any(
        e.get("source_ref",{}).get("source_type") == "functional_observation"
        and e.get("context",{}).get("environment") in ("home","community")
        for e in evidence_list
    )
    has_support_data = any(e.get("evidence_type") == "support_condition" for e in evidence_list)

    trigger = None

    if not evidence_list:
        trigger = "single_source_only"
    elif len(sources) <= 1:
        trigger = "single_source_only"
    elif not has_natural_obs:
        trigger = "no_natural_environment_observation"
    elif conflicts:
        trigger = "conflicting_evidence"
    elif not has_support_data:
        trigger = "no_support_data"
    elif coverage == "limited" and confidence == "low":
        trigger = "high_level_weak_evidence"

    if not trigger:
        return None

    tool, env = COMPLETION_TOOL_MAP.get(trigger, ("أداة مناسبة", "بيئة طبيعية"))
    return {
        "trigger":           trigger,
        "tool_recommended":  tool,
        "target_environment": env,
        "target_routine":    "يُحدد بحسب المفهوم",
        "purpose_ar":        f"استكمال فجوة التغطية في {concept_id} — رفع الثقة ودقة المستوى"
    }


# ─────────────────────────────────────────────
# 9. بناء ملخص الأدلة
# ─────────────────────────────────────────────

def build_evidence_summary(evidence_list: list) -> dict:
    """يبني ملخصاً تفسيرياً من أنواع الأدلة."""
    strengths  = [e["description_ar"] for e in evidence_list if e.get("evidence_type")=="strength"]
    emerging   = [e["description_ar"] for e in evidence_list if e.get("evidence_type")=="emerging"]
    needs      = [e["description_ar"] for e in evidence_list if e.get("evidence_type")=="need"]
    supports   = [e["description_ar"] for e in evidence_list if e.get("evidence_type")=="support_condition"]
    voices     = [e["description_ar"] for e in evidence_list if e.get("evidence_type")=="personal_voice"]

    envs = list({
        e.get("context",{}).get("environment","")
        for e in evidence_list if e.get("context",{}).get("environment")
    })

    return {
        "what_learner_does_ar":     " | ".join(strengths)  or "لم تُرصد أدلة قوة بعد",
        "what_is_emerging_ar":      " | ".join(emerging)   or "لا يوجد",
        "what_needs_support_ar":    " | ".join(needs)      or "لا يوجد",
        "effective_supports_ar":    " | ".join(supports)   or "لم تُحدد بعد",
        "contexts_where_visible_ar":" | ".join(envs)       or "غير محدد",
    }


# ─────────────────────────────────────────────
# 10. المعالج الرئيسي لمفهوم واحد
# ─────────────────────────────────────────────

def calibrate_concept(
    concept_id: str,
    concept_data: dict,
    tools_coverage: list,
    concepts_db: dict
) -> dict:
    """
    يأخذ concept_file خاماً ويُعيده مُعاياً بالكامل.
    يطبّق القواعد A–E من المواصفة.
    """
    result = copy.deepcopy(concept_data)
    evidence_list = result.get("evidence", [])

    # القاعدة A: الحد الأدنى
    has_direct   = any(e.get("evidence_type") in ("strength","emerging","need") for e in evidence_list)
    has_support  = any(e.get("evidence_type") == "support_condition" for e in evidence_list)
    has_context  = any(e.get("context") for e in evidence_list)
    sources      = {e.get("source_ref",{}).get("source_type","") for e in evidence_list}

    minimum_met = (
        has_direct
        and len(sources) >= 2
        and (has_context or has_support)
    )

    # لا أدلة على الإطلاق → incomplete كامل
    if not evidence_list:
        result["calibration_status"] = "incomplete"
        result["current_level"]      = None
        result["level_description_ar"] = None
        result["coverage"]           = "limited"
        result["confidence"]         = "low"
        result["evidence_summary"]   = None
        result["conflicts"]          = []
        result["completion_recommendation"] = generate_completion_recommendation(
            evidence_list, "limited", "low", [], concept_id
        )
        result["priority_level"]  = result.get("priority_level", "not_assessed")
        result["goal_indicators"] = []
        return result
    # الحد الأدنى غير مكتمل لكن توجد أدلة → provisional مع تحذير
    # (القاعدة A: تمنع "final" لا تمنع تقدير مبدئي)
    force_provisional = not minimum_met

    # حساب الأوزان لكل دليل
    evidence_list = compute_evidence_weights(evidence_list, concept_id)
    result["evidence"] = evidence_list

    # رصد التعارضات
    conflicts = detect_conflicts(evidence_list)
    result["conflicts"] = conflicts

    # Coverage وConfidence
    coverage   = compute_coverage(evidence_list, tools_coverage, concept_id)
    confidence = compute_confidence(evidence_list, conflicts)
    result["coverage"]   = coverage
    result["confidence"] = confidence

    # المستوى
    # القاعدة D: المستويات 5–6 تتطلب بيئتين+
    level = derive_level(evidence_list)

    if level and level >= 5:
        envs = {e.get("context",{}).get("environment","") for e in evidence_list if e.get("context")}
        if len(envs) < 2:
            level = 4  # تخفيض بسبب غياب التعميم

    result["current_level"] = level

    # وصف المستوى من concepts_db
    concept_db = concepts_db.get(concept_id, {})
    if level and concept_db:
        levels = {l["level"]: l for l in concept_db.get("levels", [])}
        lvl_data = levels.get(level, {})
        result["level_description_ar"] = (
            lvl_data.get("core_concept_ar") or LEVEL_DESCRIPTORS.get(level)
        )
    else:
        result["level_description_ar"] = LEVEL_DESCRIPTORS.get(level) if level else None

    # ملخص الأدلة
    result["evidence_summary"] = build_evidence_summary(evidence_list)

    # توصية الاستكمال
    result["completion_recommendation"] = generate_completion_recommendation(
        evidence_list, coverage, confidence, conflicts, concept_id
    )

    # حالة المعايرة
    if not minimum_met or (conflicts and confidence == "low"):
        result["calibration_status"] = "provisional"
    elif coverage == "good" and confidence == "high" and minimum_met:
        result["calibration_status"] = "final"
    else:
        result["calibration_status"] = "provisional"

    return result


# ─────────────────────────────────────────────
# 11. الدالة الرئيسية
# ─────────────────────────────────────────────

def run(profile_path: str, concepts_db_path: str, output_path: str):
    """
    profile_path:     مسار بروفايل خام (JSON)
    concepts_db_path: مسار himam_concepts.json
    output_path:      مسار المخرج المُعاير
    """
    with open(profile_path, encoding="utf-8") as f:
        profile = json.load(f)

    with open(concepts_db_path, encoding="utf-8") as f:
        concepts_full = json.load(f)

    # بناء فهرس سريع concept_id → data
    concepts_db = {}
    for c in concepts_full.get("concepts", []):
        cid = c.get("concept_id")
        if cid:
            concepts_db[cid] = c

    tools_coverage = profile.get("tools_coverage", [])
    concepts        = profile.get("concepts", {})

    calibrated_concepts = {}
    summary = []

    ALL_CONCEPTS = ["SAFETY","SELF_DET","COMM","SELF_CARE","MOBILITY",
                    "SOCIAL","COMMUNITY","HEALTH","ACADEMIC","LEARNING_TECH"]

    for cid in ALL_CONCEPTS:
        raw = concepts.get(cid, {"concept_id": cid, "evidence": []})
        calibrated = calibrate_concept(cid, raw, tools_coverage, concepts_db)
        calibrated_concepts[cid] = calibrated

        summary.append({
            "concept_id":   cid,
            "status":       calibrated["calibration_status"],
            "level":        calibrated.get("current_level"),
            "coverage":     calibrated.get("coverage"),
            "confidence":   calibrated.get("confidence"),
            "has_recommendation": calibrated.get("completion_recommendation") is not None,
            "conflicts":    len(calibrated.get("conflicts", [])),
        })

    profile["concepts"] = calibrated_concepts
    profile["engine_meta"] = {
        "engine":  "silent_engine",
        "version": "1.0",
        "calibration_summary": summary,
        "concepts_total":    len(ALL_CONCEPTS),
        "concepts_final":    sum(1 for s in summary if s["status"]=="final"),
        "concepts_provisional": sum(1 for s in summary if s["status"]=="provisional"),
        "concepts_incomplete":  sum(1 for s in summary if s["status"]=="incomplete"),
    }

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(profile, f, ensure_ascii=False, indent=2)

    print(f"✅ Silent Engine اكتمل")
    print(f"   Final:       {profile['engine_meta']['concepts_final']}")
    print(f"   Provisional: {profile['engine_meta']['concepts_provisional']}")
    print(f"   Incomplete:  {profile['engine_meta']['concepts_incomplete']}")
    print(f"   المخرج: {output_path}")

    return profile


# ─────────────────────────────────────────────
# 12. تشغيل مباشر
# ─────────────────────────────────────────────

if __name__ == "__main__":
    import sys

    base = Path(__file__).parent

    profile_path     = sys.argv[1] if len(sys.argv) > 1 else str(base / "himam_profile_example.json")
    concepts_db_path = sys.argv[2] if len(sys.argv) > 2 else str(base / "himam_concepts.json")
    output_path      = sys.argv[3] if len(sys.argv) > 3 else str(base / "himam_profile_calibrated.json")

    run(profile_path, concepts_db_path, output_path)
