# Himam Build Cycle 02 Execution Plan

تاريخ الإصدار: 2026-08-24  
الحالة: أول دورة منتج وظيفية بعد بوابات CI  
النطاق: ربط الملفات المرفوعة والمراجعة بملخص مستوى الأداء الحالي قبل إعداد الهدف.

## 1. قرار منتج مرجعي

مصدر التقييم الرسمي أو المصدر الإضافي المرفوع لا يصبح دليلاً أو مستوى أداء بمجرد رفعه. بعد مراجعة المختص لمسودة القراءة وتحويلها إلى StructuredResponse، يعرض النظام بطاقة أداء/سياق قابلة للتتبع في شاشة كفاية المعلومات.

## 2. سيناريو مستخدم محدد

كمختص، بعد أن أرفع ملف نتائج تقييم رسمي وأراجع مسودة القراءة، أفتح شاشة كفاية المعلومات فأرى:

- عدد بطاقات الأداء الحالي الناتجة من تقييم رسمي مراجع.
- عدد بطاقات السياق الناتجة من مصادر داعمة مراجعة.
- أي فجوة ملف لم تراجع بعد.
- مصدر كل بطاقة، وهل يمكن استخدامها كخط أساس لهدف أم لا.

## 3. متطلبات مجال وصلاحيات

- المختص يرى بطاقات المصدر بعد مراجعة الاستخراج فقط.
- البطاقة لا تعتمد هدفاً ولا خطة.
- المصدر الرسمي المراجع فقط يمكن أن يظهر كمدخل baseline قابل للتتبع.
- مصادر صوت الأسرة/المتعلم والمصادر الإضافية تبقى سياقاً أو دعماً معرفياً ما لم تتحول لاحقاً إلى EvidenceRecord بعقد مستقل.

## 4. تصميم بيانات مع migration قابلة للمراجعة

لا توجد migration في هذه الدورة. أضيفت بنية مشتقة داخل الواجهة:

```text
SourceFilePipelineRecord[]
→ CurrentPerformanceCard[]
→ CurrentPerformanceWorkspaceSummary
```

## 5. API أو service contract

العقد البرمجي:

```text
buildCurrentPerformanceWorkspace(records)
summarizeCurrentPerformanceWorkspace(cards)
```

المدخلات لا تقرأ الملف الخام، بل تقرأ فقط مسار المصدر المراجع وStructuredResponse المحفوظة.

## 6. تصميم واجهة

أضيفت مساحة في شاشة كفاية المعلومات بعنوان:

```text
بطاقات أداء وسياق من مصادر مرفوعة ومراجعة
```

تعرض العدادات والبطاقات وprovenance وحكم baseline.

## 7. اختبارات حسب المخاطر

- `npm run verify:build-cycle-02`
- `npm run verify:build-cycle`
- `npm run verify:governing-files`
- `npm run typecheck`
- `npm run lint`
- `npm run build`

## 8. مراجعة أمنية للوظائف الحساسة

لا تعرض الدورة محتوى ملف خام ولا تضيف قراءة AI جديدة. تعرض فقط نصوص StructuredResponse الناتجة من مراجعة المختص. البطاقات تحمل provenance ولا تغير قراراً رسمياً.

## 9. build/lint/typecheck في CI

تضاف `verify:build-cycle-02` إلى workflow الجودة حتى لا تمر الدورات اللاحقة دون إثبات هذا المسار.

## 10. مراجعة diff ضد المواصفة

يقارن diff ضد:

- `himam_mvp_prd.md`
- `himam_product_constitution.md`
- `himam_screen_operating_scenarios_2026-08-24.md`
- `himam_build_cycle_01_execution_plan_2026-08-24.md`

## 11. demo على سيناريو واقعي

الـdemo المحلي: رفع ملف تقييم رسمي نصي أو CSV، مراجعة البنود، فتح شاشة كفاية المعلومات، ثم ظهور بطاقات الأداء الحالي مع مصدرها.

## 12. تحديث سجل القرارات والوثائق

هذه الوثيقة تسجل قرار الدورة 02. لا تغير ترتيب الملفات الحاكمة لأنها وثيقة دورة تنفيذ وليست وثيقة حوكمة حاكمة.

## 13. قرار الإغلاق

```text
BUILD_CYCLE_02_SCOPE = CURRENT_PERFORMANCE_FROM_REVIEWED_SOURCE_FILES
PRODUCT_FEATURE_CHANGE = YES
DATA_MIGRATION = NO
SECURITY_SENSITIVE_FEATURE = SOURCE_FILE_METADATA_AND_REVIEWED_STRUCTURED_RESPONSES_ONLY
READY_TO_COMMIT_WHEN = verify:build-cycle-02 + verify:build-cycle + governing-files + typecheck + lint + build PASS
```
