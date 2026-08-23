# Himam Project Governance Index

تاريخ الإصدار: 2026-08-23  
آخر تنظيم: 2026-08-24  
الحالة: المدخل الحاكم الوحيد للوثائق الحاكمة

هذه الصفحة هي مدخل ملفات المشروع بعد تطبيق قواعد "جرد الأدلة قبل التصميم".

## قاعدة التنظيم

ملف `himam_governing_files_manifest.json` هو النسخة القابلة للتحقق آلياً لترتيب الملفات الحاكمة. لا يتم نقل الملفات أو إعادة تسميتها إلا إذا نتج عن ذلك تحديث صريح في هذا الفهرس والـmanifest وسكربت التحقق.

لا يبدأ أي عمل تصميمي أو برمجي من ملف منفرد. يبدأ العمل من هذا الفهرس، ثم يقرأ الملفات الحاكمة بالترتيب، ثم ينتقل إلى خطة التنفيذ أو الـsprint المقصود.

## القراءة الإلزامية بالترتيب

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
11. `himam_final_programming_transition_plan_2026-08-23.md`
12. `himam_pre_programming_governance_checklist_2026-08-24.md`

## ملفات مساندة لا تبدأ منها القرارات

هذه الملفات تفيد في التفاصيل، لكنها لا تلغي ترتيب الملفات الحاكمة أعلاه:

- `himam_specialist_journey_spec.md`
- `himam_learner_profile_spec.md`
- `himam-learner-profile-architecture-matrix.md`
- `himam_new_project_execution_document.md`
- `himam_HANDOVER.md`

## قاعدة استخدام المسودات الخارجية

أي مسودة من GitHub أو Lovable أو محادثة سابقة لا تستخدم مباشرة. تسجل أولاً كأصل في Evidence Inventory مع:

- مصدرها.
- تاريخها.
- حالتها.
- ما تثبته.
- ما لا تثبته.
- تعارضاتها.
- قرار الاستخدام.

## وضع PRD

`himam_mvp_prd.md` هو نطاق MVP الحالي، لكنه لا يفسر منفرداً. يجب قراءته تحت:

- الدستور.
- القاموس.
- سياسات الحوكمة.
- سجل القرارات.
- بوابة الجاهزية.

## قرار التثبيت

حزمة 2026-08-23 مثبتة كمرجع حاكم للانتقال إلى التنفيذ البرمجي المرحلي. أغلقت Sprints 1-6 كتحقق مرحلي محلي، ويجب أن يستمر أي Sprint لاحق وفق قاعدة التقدم: لا انتقال مع فجوة غير مغلقة أو غير مفسرة أو غير مسجلة في الملفات الحاكمة.
