# Himam Pre-Programming Governance Checklist

تاريخ الإصدار: 2026-08-24  
الحالة: قائمة تشغيل حاكمة قبل أي برمجة لاحقة  
الغرض: تثبيت الالتزام بدستور العمل الحاكم قبل استكمال أي مهمة برمجية جديدة.

## 1. قرار الالتزام

لا يبدأ أي تنفيذ برمجي جديد في HIMAM إلا بعد المرور على هذه القائمة. الالتزام ليس اجتياز `build` أو `typecheck` فقط، بل إثبات أن المهمة:

- لها أصل حاكم أو قرار مسجل.
- لا تكسر الفصل بين Source وExtraction وEvidence وKSI وInference وDecision وAudit.
- تقع داخل نطاق مسموح للمرحلة الحالية.
- لها اختبار أو تحقق مناسب.
- لا تترك فجوة غير مسجلة عند الإغلاق.

## 2. ترتيب القراءة الإلزامي

قبل أي مهمة برمجية جديدة، تقرأ الوثائق التالية بهذا الترتيب. هذا الترتيب يجب أن يطابق `himam_governing_files_manifest.json`:

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
13. `himam_architecture_readiness_pack_2026-08-24.md`

## 3. بوابة السماح قبل التنفيذ

أي مهمة جديدة يجب أن تجيب عن الأسئلة التالية قبل لمس الكود:

| السؤال | شرط المرور |
|---|---|
| ما الأصل الحاكم؟ | مرجع في Evidence Inventory أو PRD أو ADR |
| ما طبقة المجال؟ | Source / Extraction / Evidence / KSI / Inference / Decision / Audit محددة |
| هل تضيف حقلًا أو حالة أو دورًا؟ | القاموس والـADR والمسارات محدثة أو موجودة |
| هل تمس AI أو قراءة ملفات أو وسائط؟ | سياسة مراجعة بشرية وحدود فشل وموافقة موجودة |
| هل تمس اعتماد هدف أو خطة؟ | GoalApprovalRecord أو PlanApprovalRecord مع صلاحية وتدقيق |
| هل تمس الواجهة فقط؟ | لا تدعي اعتماداً أو قراراً دون سجل حاكم |
| هل تمس repo جديد أو معمارية عامة؟ | Context/Domain/Audit/Lifecycle/Permission/AI/Media/Integration/NFR/Threat محددة |
| ما الاختبار؟ | build/typecheck والتحقق المرحلي أو اختبار سلبي مناسب |

إذا كان أي جواب ناقصاً، تكون المهمة في وضع `NOT_READY_FOR_CODE`.

## 4. المسموح حالياً

وفق حزمة 2026-08-23 ونتائج Sprint 1-6، يسمح بالعمل المرحلي فقط في:

- توثيق قرار أو فجوة أو ADR قبل التنفيذ.
- تحسين عقود بيانات محلية قائمة إذا بقيت داخل حدود الدستور.
- تحسين validators أو fixtures أو verification scripts لمسار قائم.
- إثبات رحلة داخلية قابلة للتتبع دون AI إنتاجي.
- تحسين UI قائم إذا لم يضيف قراراً أو اعتماداً أو قراءة حساسة جديدة.

## 5. الممنوع حالياً

لا يبدأ ما يلي دون وثيقة حاكمة واختبار خاص:

- AI production extraction.
- OCR أو parsing إنتاجي متقدم لملفات تقييم محمية.
- اعتماد إنتاجي لهدف أو خطة بصلاحيات خادم فعلية.
- وسائط حساسة بلا consent/retention/delete/redaction policy.
- صلاحيات إنتاجية متعددة الأدوار دون هوية وعلاقة بالحالة وغرض وصول.
- تقرير رسمي أو claim بلا SourceRef وتتبع.
- استخدام KSI كbaseline أو criterion.
- استخدام مسودة GitHub أو Lovable أو محادثة خارجية دون تسجيلها في Evidence Inventory.

## 6. حالة المشروع عند هذه البوابة

الحالة المحلية المثبتة:

- Sprint 1-6: `PASS` حسب ملفات `verification`.
- Typecheck/build: نجحت في آخر تشغيل محلي.
- حزمة الجاهزية المعمارية قبل البرمجة: `ACCEPTED_FOR_PHASED_PROGRAMMING`.
- فجوات الإنتاج المتبقية: AI/OCR الإنتاجي، الهوية والصلاحيات الخادمية، الوسائط الإنتاجية، التكامل الإنتاجي، Browser E2E إنتاجي.

حالة عمل معلقة:

- لا توجد تعديلات برمجية معلقة وقت تحديث هذه القائمة.
- تعديل أداء صفحة الخطة حسم في commit `5035337` كتغيير performance لا كتغيير نطاق أو حوكمة.

## 7. قاعدة الإغلاق قبل التقدم

لا تغلق أي مهمة أو Sprint لاحق إلا إذا سجلت:

- ما تم إنجازه.
- الملفات المتأثرة.
- نتائج التحقق.
- الفجوات المؤجلة وسبب تأجيلها.
- ما لا يجوز اعتباره منجزاً بسبب هذه الفجوات.
- المرحلة أو المالك المتوقع لإغلاق كل بند مؤجل.

إذا تعذر ذلك، تكون الحالة: `INCOMPLETE_DO_NOT_BUILD_ON_AS_FINAL`.

## 8. قرار العمل التالي

قبل أي برمجة لاحقة، الخطوة الصحيحة هي اختيار بند واحد من قائمة الاستعداد التالية:

1. حسم التعديل البرمجي المعلق في صفحة الخطة: قبول/مراجعة/تراجع.
2. تحديث Evidence Inventory إذا سنستخدم أي مسودة خارجية جديدة.
3. إنشاء ADR جديد إذا كانت المهمة تضيف حقلًا أو صلاحية أو حالة قرار.
4. كتابة سيناريو Given/When/Then للمهمة التالية قبل تنفيذها.
5. تحديد VerificationRun المطلوب قبل فتح الكود.
6. مطابقة المهمة مع قسم محدد في `himam_architecture_readiness_pack_2026-08-24.md` إذا كانت تمس repo أو معمارية عامة.
