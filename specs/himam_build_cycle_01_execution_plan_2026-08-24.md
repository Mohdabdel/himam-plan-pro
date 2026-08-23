# Himam Build Cycle 01 Execution Plan

تاريخ الإصدار: 2026-08-24  
الحالة: أول دورة تنفيذ برمجية بعد إغلاق بوابات ما قبل البرمجة  
النطاق: تثبيت بوابة تحقق آلية وCI قبل فتح تغييرات منتج أوسع.

## 1. قرار منتج مرجعي

هذه الدورة لا تضيف ميزة مستخدم جديدة. قرارها المرجعي هو تحويل قواعد `himam_pre_programming_governance_checklist_2026-08-24.md` إلى فحص قابل للتشغيل، حتى لا تبدأ الدورات التالية من ذاكرة أو حدس.

## 2. سيناريو مستخدم محدد

كمطور/مراجع داخل مشروع HIMAM، عندما أبدأ دورة برمجية جديدة أحتاج إلى أمر واحد يثبت أن:

- الملفات الحاكمة موجودة ومرتبة.
- دورة البناء الـ12 مثبتة.
- خرائط workflow وسيناريوهات الشاشات موجودة.
- CI يملك أوامر lint/typecheck/build والتحققات الحاكمة.

## 3. متطلبات مجال وصلاحيات

لا تمس هذه الدورة بيانات متعلم أو صلاحيات مستخدم نهائي. صلاحيتها تشغيلية داخل المستودع فقط. لا تضيف role ولا access rule للمنتج.

## 4. تصميم بيانات مع migration قابلة للمراجعة

لا توجد migration في هذه الدورة. الناتج الوحيد هو `verification/build-cycle-01-run.json`.

## 5. API أو service contract

العقد التشغيلي:

```text
npm run verify:build-cycle
```

ينتج JSON بحالة `PASS/FAIL` ويكتب نتيجة قابلة للمراجعة في `verification/build-cycle-01-run.json`.

## 6. تصميم واجهة

لا توجد واجهة مستخدم جديدة. واجهة الاستخدام هي CLI verification output.

## 7. الاختبارات حسب المخاطر

- `npm run verify:governing-files`
- `npm run verify:build-cycle`
- `npm run typecheck`
- `npm run lint`
- `npm run build`

## 8. مراجعة أمنية للوظائف الحساسة

الدورة لا تلمس AI أو ملفات حساسة أو وسائط أو اعتماد أو تصدير. الخطر الأمني الوحيد هو CI؛ لذلك يستخدم `npm ci` ويشغل أوامر قراءة/بناء فقط دون أسرار.

## 9. build/lint/typecheck في CI

تضاف workflow في `.github/workflows/quality-gates.yml` لتشغيل:

- `npm ci`
- `npm run verify:governing-files`
- `npm run verify:build-cycle`
- `npm run typecheck`
- `npm run lint`
- `npm run build`

## 10. مراجعة diff ضد المواصفة

أي diff في هذه الدورة يقارن ضد:

- `himam_pre_programming_governance_checklist_2026-08-24.md`
- `himam_governing_files_manifest.json`
- `himam_workflow_maps.md`
- `himam_screen_operating_scenarios_2026-08-24.md`

## 11. demo على سيناريو واقعي

الـdemo هو تشغيل `npm run verify:build-cycle` ثم رؤية `PASS` مع عدد البوابات المطلوبة.

## 12. تحديث سجل القرارات والوثائق

هذه الوثيقة هي سجل دورة 01. لا تحتاج ADR جديد لأنها لا تغير قرار منتج أو نطاق مستخدم، بل تحول قاعدة قائمة إلى تحقق.

## 13. قرار الإغلاق

```text
BUILD_CYCLE_01_SCOPE = GOVERNANCE_AUTOMATION_AND_CI
PRODUCT_FEATURE_CHANGE = NO
DATA_MIGRATION = NO
SECURITY_SENSITIVE_FEATURE = NO
READY_TO_COMMIT_WHEN = verify:build-cycle + governing-files + typecheck + lint + build PASS
```
