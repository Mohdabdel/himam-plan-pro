# Himam Build Cycle 03 Execution Plan

تاريخ الإصدار: 2026-08-29  
الحالة: دورة برمجة لمعالجة معلومات الأدوات والملفات كبروفايل تشغيلي  
النطاق: تحويل مخرجات الأدوات غير الرسمية والمسوح والقوائم والملفات المراجعة إلى قراءة بروفايل تساعد في مستوى الأداء الحالي وبناء الأهداف.

## 1. قرار منتج مرجعي

مخرجات أدوات المعلومات ليست ملاحظات هامشية ولا دعماً معرفياً فقط. عند تطبيق أداة داخل المنصة أو رفع نتائجها ومراجعتها، يجب أن تدخل في معالجة مهنية منظمة تبني بروفايل المتعلم وتوجه إعداد الأهداف والخطة.

لا يعني ذلك اعتماداً آلياً أو scoring كاملاً. المعالجة الحالية متوسطة، قابلة للتطوير، وتبقى تحت تفسير المختص.

## 2. سيناريو مستخدم محدد

كمختص، بعد أن أطبق أداة أو أرفع ملفاً وأراجعه، أفتح شاشة كفاية المعلومات فأرى:

- المدخلات المصنفة من الأدوات والملفات.
- المفاهيم المتأثرة.
- مسودة مستوى أداء لكل مفهوم عند توفر دليل أو سياق.
- فرص أهداف مستخرجة من الاحتياج، الأولوية، الخطر، الدعم، أو مرشح الدليل.
- حدود واضحة تمنع تحويل الإشارة إلى قرار دون مراجعة.

وعند فتح شاشة توليد الأهداف، أستطيع اختيار "إشارات بروفايل من أدوات المعلومات" كمصدر للهدف، ثم أرى ما يخص المجال المختار فقط.

## 3. متطلبات مجال وصلاحيات

- كل مدخل يبقى منسوباً إلى مصدره.
- القراءة الآلية/القواعدية تصنف وتفرز ولا تعتمد.
- مرشح دليل الأداء لا يصبح مستوى أداء نهائي إلا بمراجعة مختص.
- التحليل السيكومتري الكامل لا يضاف إلا بعقد أداة مستقل.
- لا يجوز استخدام معلومات غير مراجعة من ملف مرفوع في هدف أو تقرير.

## 4. تصميم بيانات مع migration قابلة للمراجعة

لا توجد migration في هذه الدورة. أضيفت نماذج مشتقة داخل التطبيق:

```text
InformationRecord[]
SourceFilePipelineRecord[]
→ ProcessedProfileInput[]
→ ProcessedConceptProfile[]
→ LearnerProfileProcessingModel
→ ProfileGoalOpportunity[]
```

## 5. API أو service contract

العقود البرمجية:

```text
classifyConceptIdsFromText(text)
classifySignalKindsFromText(text)
canCandidateInformPerformance(text, kinds)
buildLearnerProfileProcessingModel({ learnerId, informationRecords, sourcePipelines })
```

## 6. تصميم واجهة

تظهر القراءة الموحدة في:

- شاشة كفاية المعلومات ومستوى الأداء الحالي.
- فهرس إعداد الخطة.
- شاشة توليد الأهداف، داخل إطار الدعم المعرفي وخطوة اختيار مصدر الهدف.

## 7. اختبارات حسب المخاطر

- `npm run verify:build-cycle-03`
- `npm run verify:build-cycle-02`
- `npm run verify:governing-files`
- `npm run typecheck`
- `npm run lint`
- `npm run build`

## 8. مراجعة أمنية للوظائف الحساسة

لا تضيف الدورة إرسال بيانات إلى AI ولا تخزن محتوى خاماً خارج سياسة الملفات الحالية. تستخدم فقط إجابات أدوات محفوظة واستجابات منظمة راجعها المختص.

## 9. build/lint/typecheck في CI

يجب إضافة `verify:build-cycle-03` إلى workflow الجودة.

## 10. مراجعة diff ضد المواصفة

يقارن diff ضد:

- `himam_learner_profile_spec.md`
- `himam-learner-profile-architecture-matrix.md`
- `himam_mvp_prd.md`
- `himam_build_cycle_02_execution_plan_2026-08-24.md`

## 11. demo على سيناريو واقعي

1. تطبيق أداة وصفية داخل المنصة.
2. رفع ملف أو مصدر ومراجعته.
3. فتح كفاية المعلومات ورؤية قراءة بروفايل موحدة.
4. فتح توليد الأهداف واختيار مصدر "إشارات بروفايل من أدوات المعلومات".
5. مراجعة فرصة هدف ومسودة أداء مرتبطة بالمجال.

## 12. تحديث سجل القرارات والوثائق

هذه الوثيقة تسجل قرار الدورة 03. لا تغير ترتيب الملفات الحاكمة لأنها وثيقة دورة تنفيذ لا وثيقة حوكمة حاكمة.

## 13. قرار الإغلاق

```text
BUILD_CYCLE_03_SCOPE = INFORMAL_TOOLS_AND_REVIEWED_FILES_TO_PROFILE_PROCESSING
PRODUCT_FEATURE_CHANGE = YES
DATA_MIGRATION = NO
SECURITY_SENSITIVE_FEATURE = REVIEWED_STRUCTURED_RESPONSES_AND_LOCAL_INFORMATION_RECORDS_ONLY
READY_TO_COMMIT_WHEN = verify:build-cycle-03 + verify:build-cycle-02 + governing-files + typecheck + lint + build PASS
```
