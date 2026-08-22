# Himam Final Programming Transition Plan

تاريخ الإصدار: 2026-08-23  
الحالة: معتمد للانتقال إلى التنفيذ البرمجي المرحلي  
النطاق: تثبيت مسودة الحوكمة والـPRD وخطة العمل البرمجية التالية

## 1. الحكم النهائي

بعد مراجعة حزمة الحوكمة والـPRD وتحليل الفجوات، لا توجد حاجة لاعتماد وثائقي إضافي داخل المشروع قبل الانتقال إلى التنفيذ البرمجي المرحلي.

الحالة المعتمدة:

```text
Evidence Inventory and Authority Map = ACCEPTED
Product Constitution = ACCEPTED
Domain Glossary = ACCEPTED_FOR_STAGE_1
Workflow Maps = ACCEPTED_FOR_STAGE_1
Decision and Conflict Register = ACTIVE
Governance, Privacy, and AI Policy = ACCEPTED_FOR_STAGE_1
Readiness Gate = PASSED_FOR_STAGE_1_DATA_CONTRACTS
MVP PRD = ACCEPTED_FOR_IMPLEMENTATION_PLANNING
```

## 2. حدود القرار

هذا القرار يسمح ببدء التنفيذ البرمجي في:

- عقود البيانات.
- الـschemas والـvalidators.
- fixtures والاختبارات السلبية.
- مستودعات التخزين الأولية.
- إثبات رحلة داخلي بدون AI إنتاجي.

هذا القرار لا يسمح بعد بـ:

- AI production extraction.
- اعتماد خطة أو هدف إنتاجياً.
- قراءة ملفات تقييم محمية بلا قوالب وترخيص ومراجعة.
- صلاحيات إنتاجية متقدمة.
- وسائط حساسة.
- نشر إنتاجي.

## 3. خطة العمل البرمجية

### Sprint 1 — Data Contracts and Validation

الهدف: تحويل قرارات الحوكمة إلى عقود قابلة للتحقق.

المهام:

1. إضافة الأنواع التالية إلى domain:
   - `UploadedSourceFile`
   - `ExtractedSourceDraft`
   - `SourceExtractionReview`
   - `GoalApprovalRecord`
   - `PlanDraft`
   - `PlanQualityReview`
   - `PlanApprovalRecord`
2. إضافة enums لازمة:
   - extraction status
   - review decision
   - approval decision
   - source file sensitivity
   - AI draft boundary
3. إضافة Zod schemas.
4. إضافة validators تمنع:
   - تحويل ملف مرفوع إلى EvidenceRecord مباشرة.
   - تحويل ExtractedSourceDraft إلى دليل دون review.
   - استخدام KSI كbaseline أو criterion.
   - إنشاء PlanApprovalRecord دون أهداف معتمدة للإدراج.
   - وصف AI output كقرار.
5. إضافة fixtures موجبة وسلبية.
6. تحديث VerificationRun جديد لهذه المرحلة.

معيار الإغلاق:

```text
build = PASS
typecheck = PASS
dataIntegrity = PASS
userJourney = PASS
traceability = PASS
```

### Sprint 2 — Repository and Workflow Proof

الهدف: إثبات رحلة داخلية قابلة للتتبع دون واجهة إنتاجية.

المهام:

1. إضافة repositories للكيانات الجديدة.
2. إثبات مسار:

```text
UploadedSourceFile
→ ExtractedSourceDraft
→ SourceExtractionReview
→ StructuredResponse
→ EvidenceRecord / KSI / InferenceSuggestion
```

3. إثبات مسار:

```text
GoalDraft
→ GoalQualityCheck
→ GoalApprovalRecord
→ PlanDraft
→ PlanQualityReview
→ PlanApprovalRecord
```

4. إضافة trace checks لكل مسار.

### Sprint 3 — Knowledge Support and Goal Studio Wiring

الهدف: ربط شاشة دعم المعرفة وإعداد الهدف دون كسر حدود القرار.

المهام:

1. فصل `KnowledgeSupportPanel` إلى route أو drawer واضح.
2. بناء `KnowledgeCard` مع effect boundary.
3. بناء `GoalKnowledgePin`.
4. منع اختيار KSI كbaseline.
5. ربط الهدف بمصدر/دليل مناسب.

### Sprint 4 — File Reading Draft Flow

الهدف: قراءة ملفات مرفوعة كمسودات استخراج فقط.

المهام:

1. دعم قراءة أولية لصيغ مسموحة.
2. تخزين extraction result كمسودة.
3. عرض شاشة مراجعة وتصحيح.
4. تحويل المراجعة إلى StructuredResponse فقط بعد قرار مختص.
5. إضافة حالات فشل: ملف غير قابل للقراءة، ملف ناقص metadata، ملف محمي.

### Sprint 5 — E2E MVP Verification

الهدف: إثبات الرحلة المرجعية:

```text
إنشاء متعلم
→ رفع مصدر
→ استخراج ومراجعة
→ كفاية معلومات
→ دعم معرفة
→ هدف
→ اعتماد هدف
→ خطة
→ اعتماد أعلى
→ trace
```

## 4. ترتيب الملفات الحاكمة

أي تنفيذ يجب أن يراجع بالترتيب:

1. `himam_project_governance_index.md`
2. `himam_evidence_inventory_authority_map.md`
3. `himam_product_constitution.md`
4. `himam_domain_glossary.md`
5. `himam_workflow_maps.md`
6. `himam_decision_and_conflict_register.md`
7. `himam_governance_privacy_ai_policy.md`
8. `himam_readiness_gate_and_execution_rules.md`
9. `himam_gap_analysis_2026-08-23.md`
10. `himam_mvp_prd.md`

## 5. قرار البدء

```text
START_PROGRAMMING = YES
START_SCOPE = Sprint 1 — Data Contracts and Validation
START_FROM_UI = NO
START_FROM_AI = NO
START_FROM_PRODUCTION_APPROVAL = NO
```

