# Himam Build Cycle 06 Execution Plan

تاريخ الإصدار: 2026-08-31  
الحالة: بوابة ما قبل البرمجة لجاهزية التقرير  
النطاق: فصل مسودة التقرير/المراجعة عن التقرير النهائي، ومنع إعلان `report_generated` أو الطباعة النهائية قبل اعتماد الخطة.

## 1. قرار منتج مرجعي

- فتح شاشة التقرير لا يعني توليد تقرير نهائي.
- التقرير النهائي لا يكون جاهزاً إلا بعد وجود أهداف مرفوعة لمسار الخطة، وخطة تنفيذية محفوظة، وأنشطة مختارة، وقرار اعتماد خطة محفوظ من المختص الأعلى.
- إذا كانت الأهداف محفوظة كمسودة عليها موانع تقدم، أو لا توجد خطة جاهزة، تظهر الشاشة كمسودة مراجعة لا كتقرير نهائي.
- لا يتم تحديث حالة المتعلم إلى `report_generated` بمجرد زيارة الرابط.

## 2. سيناريو مستخدم محدد

كمختص، عندما يفتح التقرير قبل اكتمال الاعتماد:

- يرى وسم حالة واضح يشرح لماذا التقرير ليس نهائياً.
- يرى الإجراء التالي: الرجوع للأهداف أو الخطة أو اعتماد الخطة.
- يستطيع مراجعة المحتوى المتاح كمسودة، لكن لا يطبع التقرير كنسخة نهائية.

كمراجع أعلى، بعد اعتماد الخطة:

- يستطيع فتح التقرير النهائي وطباعته.
- عندها فقط تسجل الرحلة أن التقرير تم توليده.

## 3. متطلبات مجال وصلاحيات

- `GoalDraft` محفوظ كمسودة لا يكفي لإصدار تقرير نهائي.
- `GoalApprovalRecord` شرط لدخول الهدف في الخطة.
- `PlanDraft` مع أنشطة شرط لجاهزية التقرير.
- `PlanApprovalRecord.decision = approved` شرط لإعلان التقرير النهائي.
- لا تضيف هذه الدورة صلاحية اعتماد جديدة.

## 4. تصميم بيانات مع migration قابلة للمراجعة

لا توجد migration. تعتمد الدورة على بيانات التخزين المحلي الحالية:

```text
himam_iep_{learnerId}.reviewStatus
himam_iep_{learnerId}.draftProgressTag
himam_iep_{learnerId}.goalApprovalIds
himam_plan_{learnerId}.status
himam_plan_approval_{learnerId}.decision
→ ReportReadiness
```

## 5. API أو service contract

عقد شاشة التقرير:

```text
evaluateReportReadiness(iep, plan, planApproval) → ReportReadinessResult
```

المخرجات:

- `status`
- `labelAr`
- `messageAr`
- `nextActionAr`
- `finalReportReady`

## 6. تصميم واجهة

- إذا لم تجهز الشروط، تظهر الشاشة بعنوان مسودة مراجعة التقرير.
- تظهر بطاقة بوابة جاهزية التقرير أعلى المحتوى.
- أزرار الطباعة تكون معطلة عندما `finalReportReady = false`.
- عند الجاهزية، يظهر العنوان كتقرير شامل نهائي وتتاح الطباعة.

## 7. اختبارات حسب المخاطر

- `npm run verify:build-cycle-06`
- `npm run verify:build-cycle-05`
- `npm run verify:governing-files`
- `npm run typecheck`
- `npm run lint`
- `npm run build`

اختبارات سلبية لازمة:

- فتح التقرير قبل اعتماد الخطة لا يكتب `report_generated`.
- مسودة أهداف عليها موانع تقدم تظهر كمسودة مراجعة لا تقرير نهائي.
- خطة بلا أنشطة لا تتيح الطباعة النهائية.
- خطة غير معتمدة لا تتيح الطباعة النهائية.

## 8. مراجعة أمنية للوظائف الحساسة

- لا يوجد اعتماد آلي.
- لا يوجد تقرير نهائي من مسودة غير مكتملة.
- لا يسمح الرابط المباشر بتجاوز مسار الاعتماد.
- لا تُخفى حالة النقص أو المانع عن المختص.

## 9. build/lint/typecheck في CI

يجب تسجيل `verify:build-cycle-06` في `package.json` وCI.

## 10. مراجعة diff ضد المواصفة

يقارن diff ضد:

- `src/routes/students.$id.report.tsx`
- `src/lib/goal-plan-approval.ts`
- `src/lib/journey.ts`
- هذه الوثيقة.

## 11. demo على سيناريو واقعي

1. افتح التقرير قبل اعتماد الخطة.
2. تظهر بطاقة مسودة مراجعة وتتعطل الطباعة النهائية.
3. ارجع للخطة واعتمدها.
4. افتح التقرير مرة أخرى.
5. يظهر التقرير النهائي وتتاح الطباعة.

## 12. تحديث سجل القرارات والوثائق

هذه الوثيقة تسجل دورة بناء 06 كدورة تنفيذ لاحقة لا كوثيقة حوكمة حاكمة، لذلك لا تغير ترتيب `himam_governing_files_manifest.json`.

## 13. قرار الإغلاق قبل التقدم

```text
BUILD_CYCLE_06_SCOPE = REPORT_READINESS_GATE
PRE_PROGRAMMING_GATE = APPLIED
PRODUCT_FEATURE_CHANGE = YES
DATA_MIGRATION = NO
AI_OR_FILE_READING_CHANGE = NO
APPROVAL_AUTHORITY_CHANGE = NO
FINAL_REPORT_BOUNDARY = PLAN_APPROVAL_REQUIRED
READY_FOR_CODE_WHEN = verify:build-cycle-06 + verify:build-cycle-05 + governing-files PASS
```
