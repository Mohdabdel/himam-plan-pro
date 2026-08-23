# Himam Architecture Readiness Pack

تاريخ الإصدار: 2026-08-24  
الحالة: حزمة جاهزية معمارية حاكمة قبل إنشاء repo أو بدء برمجة جديدة  
الغرض: إغلاق البنود المعمارية العشرة التي لا يجوز تركها كفجوات مخفية قبل الانتقال البرمجي.

## 1. قرار الجاهزية

هذه الوثيقة لا تعلن جاهزية إنتاجية كاملة. هي تثبت الحد الأدنى المعماري الذي يسمح ببدء برمجة مرحلية مضبوطة، بشرط أن تبقى القيود التالية فعالة:

- لا AI إنتاجي بلا عقود استخدام ومراجعة وسجل تشغيل.
- لا وسائط حساسة بلا سياسة تخزين وتشفير واحتفاظ وحذف.
- لا صلاحيات إنتاجية بلا هوية خادمية وعلاقة حالة وغرض وصول.
- لا تكامل خارجي يزامن بيانات متعلم بلا استراتيجية تعارض وتدقيق.
- لا حذف أو تعديل زمني لقرارات أو أحداث تدقيق حاكمة.

## 2. Context Diagram

### الجهات والحدود

| الطرف | داخل/خارج النظام | العلاقة |
|---|---|---|
| المختص | داخل | يجمع مصادر المعلومات، يراجع المسودات، يعد الأهداف، يقترح الخطة |
| المختص الأعلى | داخل | يعتمد الهدف كوحدة أو يراجع الخطة كوحدة متكاملة |
| إدارة المؤسسة | داخل | تضبط الأدوار، الحالات، السياسات، وسجلات التدقيق |
| الأسرة/المتعلم | مصدر معلومات وموافقة | يقدم صوتاً وأولويات وموافقات أو سحب موافقة |
| أنظمة المؤسسة | خارج | قد تستورد قائمة متعلمين أو تصدر تقارير لاحقاً |
| ملفات التقييم والأدوات | حدود إدخال | تدخل كـUploadedSourceFile ثم ExtractedSourceDraft ثم مراجعة بشرية |
| AI | خدمة مساعدة مقيدة | يستخرج/يلخص/يقترح فقط ضمن مراجعة وسجل |
| الوسائط | مصدر حساس | صورة/صوت/فيديو/عينة أداء تخضع لموافقة وسياسة احتفاظ |

### التدفق الحاكم

```text
User/Institution
→ Learner Case
→ Source/File/Media Intake
→ Extraction Draft
→ Human Review
→ Evidence/KSI/Inference
→ Goal Draft
→ Goal Approval
→ Plan Draft
→ Plan Review/Approval
→ Execution/Progress
→ Report/Export
→ Audit Trail
```

أي تدفق يتجاوز Source → Extraction → Review → Evidence يعد غير معتمد.

## 3. Domain Architecture

| الوحدة | حدها المهني | لا تملك |
|---|---|---|
| Case | هوية المتعلم، الحالة، العلاقة بالمؤسسة | لا تستنتج مستوى أداء |
| Source | أصل المعلومة وmetadata والموافقة | لا يتحول إلى دليل مباشرة |
| Extraction | مسودة قراءة أو تصنيف | لا يقرر صحة المعلومة |
| Evidence | دليل أداء منظم ومراجع | لا يعتمد هدفاً أو خطة |
| KSI | معرفة داعمة غير معيارية | لا تستخدم baseline أو criterion |
| Planning | GoalDraft وPlanDraft | لا يعتمد نهائياً دون Decision |
| Execution | جلسات، قياسات، شواهد تنفيذ | لا يغير التاريخ المهني للقرار |
| Progress | قياس وتقدم وتفسير | لا يحذف الدليل الأصلي |
| Decision | اعتماد/رفض/إرجاع ومبرر وصلاحية | لا يصدر بلا Audit |
| Collaboration | تعليقات ومراجعات ومهام | لا يغير سجلات اعتماد مباشرة |
| Media | تخزين وعرض وسحب موافقة | لا يفتح وصولاً بلا سياسة |
| AI | استخراج وتلخيص واقتراح | لا يتخذ قراراً ولا يرفع مستوى أداء |
| Administration | أدوار، سياسات، مؤسسة، إعدادات | لا يقرأ بيانات حالة بلا غرض |

قاعدة الحدود: أي وحدة تضيف حالة أو قراراً يجب أن تسجل مصدرها وسجل تدقيقها وسببها.

## 4. Event and Audit Model

### أحداث غير قابلة للفقد أو تعديل تاريخها

| الحدث | سبب الحفظ | أقل بيانات مطلوبة |
|---|---|---|
| إنشاء حالة متعلم | بداية المسؤولية | actor, role, learnerId, timestamp, consentState |
| رفع ملف/وسيط | أصل بيانات حساس | sourceId, fileMetadata, sensitivity, uploader, consent |
| إنشاء مسودة استخراج | فصل AI/قراءة عن الدليل | draftId, sourceId, method, status, timestamp |
| اعتماد مراجعة استخراج | تحويل مسودة إلى بيانات منظمة | reviewer, decision, rationale, sourceRef |
| اعتماد هدف | إدراج الهدف في الخطة | goalId, approverRole, decision, rationale |
| تعديل خطة | أثر مهني على الخطة | planDraftId, changedFields, actor, reason |
| اعتماد خطة | قرار أعلى الصلاحية | planApprovalId, role, decision, qualityReviewRef |
| إدخال قياس تقدم | سجل أداء زمني | metricId, context, value, evidenceRef, actor |
| حذف/إخفاء وسيلة | أثر خصوصية وتدقيق | mediaId, policyReason, consentState, actor |
| سحب موافقة | يغير الوصول والاحتفاظ | consentId, scope, effectiveAt, actor |
| مشاركة تقرير | خطر تسريب | reportId, recipient, purpose, expiry, actor |
| تصدير بيانات | خروج من الحدود | exportId, fields, recipientSystem, legalBasis |

### قواعد التدقيق

- Audit append-only: لا يعدل حدث سابق، بل يضاف حدث تصحيح أو إبطال.
- لا يستخدم توقيت جهاز المستخدم كمصدر وحيد للقرارات الحاكمة.
- لا يجوز حذف AuditRecord عند حذف ملف أو وسيط؛ يسجل الحدث وتخفى البيانات حسب السياسة.
- أي read access لبيانات حساسة أو تقرير أو وسيط يسجل عند الإنتاج.

## 5. Data Lifecycle Map

| المرحلة | المسموح | الممنوع |
|---|---|---|
| الدخول | جمع مصدر بغرض واضح وموافقة/أساس مشروع | إدخال ملف مجهول metadata |
| التصنيف | تحديد نوع البيانات والحساسية | تصنيف عام لكل الملفات كآمنة |
| الاستخدام | بناء أداء حالي وهدف وخطة مع مصدر | استخدام KSI كمستوى أداء |
| المشاركة | تقرير بغرض ومستلم وتاريخ صلاحية | رابط مفتوح دائم أو بلا audit |
| الأرشفة | تجميد حالة/خطة مع بقاء التتبع | تعديل تاريخ قرار مؤرشف |
| التصدير | حقول محددة وسبب ومتلقي | مزامنة كل البيانات افتراضياً |
| الحذف | حذف أو إخفاء وفق نوع البيانات والالتزام | حذف التدقيق أو القرار التاريخي |
| سحب الموافقة | وقف وصول/عرض/استخدام مستقبلي حسب النطاق | افتراض أن السحب يحذف كل التاريخ المهني |

سحب الموافقة يطبق على الاستخدام المستقبلي والعرض والاحتفاظ حسب نوع البيانات. الأدلة أو القرارات التي بنيت قبل السحب لا تختفي بصمت؛ توسم بأنها مرتبطة بمصدر سحبت موافقته وتمنع المشاركة الخارجية إلا بقرار مؤسسي.

## 6. Permission Design

قرار الوصول ليس role فقط. الصيغة الحاكمة:

```text
role + relationshipToCase + purpose + dataClass + consentState + recordState + action
```

| العامل | أمثلة |
|---|---|
| role | Specialist, SeniorSpecialist, ProgramAdmin, Viewer |
| relationshipToCase | assigned, supervising, institutional_admin, none |
| purpose | collect, review, approve, execute, report, audit |
| dataClass | identifying, educational, sensitive, media, AIOutput, audit |
| consentState | active, withdrawn, unknown, restricted |
| recordState | draft, reviewed, approved, archived, deleted_view |
| action | read, create, update, approve, export, share, delete |

قواعد إلزامية:

- المختص لا يعتمد الخطة النهائية.
- المختص الأعلى لا يرى وسائط حساسة إلا مع علاقة حالة وغرض مراجعة.
- الإدارة لا تستخدم صلاحية عامة لقراءة كل حالة بلا غرض مسجل.
- export/share يحتاج سبب ومستلم ونطاق ومدة صلاحية.
- read access للوسائط والتقارير يسجل.

## 7. AI Architecture

### المسار المعتمد

```text
Approved Source
→ Retrieval/Parsing Attempt
→ ExtractedSourceDraft
→ Human Review
→ StructuredResponse
→ Evidence/KSI/InferenceSuggestion
→ Goal/Plan Support
```

### السياسة

| المحور | القاعدة |
|---|---|
| المصادر | AI لا يعمل على ملف بلا metadata وحالة موافقة |
| retrieval | يعرض sourceRef ولا يقتبس بلا مرجع |
| extraction | يخرج مسودة فقط |
| review | المختص يوافق أو يعدل أو يرفض |
| logging | يسجل model/provider/version/prompt class/source IDs |
| model policy | لا ترسل بيانات حساسة لخدمة غير معتمدة |
| fallback | فشل القراءة ينتج failure reason لا تخمين |
| safety | توقف عند تعارض، حساسية عالية، نقص موافقة، أو مطالبة بقرار |

محظورات AI:

- إنشاء هدف معتمد.
- اعتماد خطة.
- رفع مستوى أداء من KSI أو صوت أسرة وحده.
- استخدام بيانات مصدر سحبت موافقته في توليد جديد.
- إرسال وسائط حساسة خارج حدود المؤسسة دون سياسة صريحة.

## 8. Media Architecture

| المجال | القرار المرحلي |
|---|---|
| التخزين | تخزين منفصل عن بيانات الخطة مع metadata محمية |
| التشفير | تشفير at rest وin transit في الإنتاج |
| redaction | إخفاء وجوه/أسماء/أصوات عند مشاركة خارجية إذا لزم |
| retention | مدة احتفاظ حسب نوع الوسيط والغرض والموافقة |
| viewing | عرض محدود بغرض وعلاقة حالة |
| download | ممنوع افتراضياً للوسائط الحساسة إلا بسياسة ومبرر |
| deletion | حذف فعلي أو حجب منطقي حسب الالتزام وسجل التدقيق |
| access logs | يسجل فتح/تنزيل/مشاركة/حذف وسيلة |

قبل إنتاج وسائط حساسة يجب إنشاء عقود: MediaAsset, MediaConsent, MediaAccessEvent, MediaRetentionPolicy.

## 9. Integration Strategy

| الاتجاه | المسموح مرحلياً | الممنوع قبل سياسة تكامل |
|---|---|---|
| import | قائمة متعلمين أو بيانات تعريفية محدودة | استيراد تقييم حساس دون metadata وموافقة |
| export | تقرير أو plan snapshot بصلاحية وغرض | تصدير تلقائي لكل الأدلة والوسائط |
| sync | لا مزامنة ثنائية افتراضياً | مزامنة تكسر القرار المحلي |
| conflict | يسجل conflict ولا يدمج بصمت | last-write-wins على قرارات أو خطط |
| identifiers | mapping داخلي وخارجي قابل للتدقيق | استخدام اسم المتعلم كمعرف تكامل |

أي تكامل يحتاج IntegrationContract يتضمن: fields, direction, frequency, owner, legalBasis, conflictPolicy, retryPolicy, auditPolicy.

## 10. Non-Functional Requirements

| المجال | الحد الأدنى قبل التنفيذ المرحلي |
|---|---|
| الأداء | فصل chunks الكبيرة، تحميل مؤجل للمسارات الثقيلة، مؤشرات تحميل واضحة |
| النسخ الاحتياطي | سياسة backup للبيانات والملفات وسجلات التدقيق قبل الإنتاج |
| الاستعادة | اختبار restore دوري قبل إطلاق إنتاجي |
| التوافر | تعريف RTO/RPO للبيئة الإنتاجية |
| العربية RTL | RTL افتراضي، عدم كسر النص العربي، لا قص للأزرار أو الجداول |
| قابلية الوصول | labels، contrast، keyboard navigation للمسارات الأساسية |
| المراقبة | errors, audit failures, AI failures, export/share events |
| السجلات | فصل app logs عن audit logs وعدم تسجيل بيانات حساسة خام |
| الأمن | least privilege، session control، secure storage، secret management |
| التشغيل | migrations، feature flags للمسارات الحساسة، rollback plan |

## 11. Threat Model

| التهديد | الأثر | التخفيف الحاكم |
|---|---|---|
| تسريب تقرير | كشف بيانات حساسة | share policy, expiry, recipient logging |
| مشاركة خاطئة | وصول غير مصرح | purpose + relationship + audit before share |
| صلاحية زائدة | قراءة حالات بلا علاقة | ABAC لا role فقط |
| رابط وسائط مفتوح | تسريب فيديو/صوت | signed URL قصير، no public media |
| خروج بيانات إلى AI | خرق خصوصية | model policy وsource consent وredaction |
| حذف غير مقصود | فقد دليل أو وسيط | soft delete, retention, restore path |
| تعديل تاريخ قرار | تلاعب مهني | append-only audit, server time, correction events |
| حساب مخترق | قرارات أو مشاركة غير مصرح بها | MFA لاحقاً، session revocation، anomaly logs |
| تعارض تكامل | خطة أو بيانات خاطئة | conflict register لا دمج صامت |
| prompt injection من ملف | AI يخرج عن الحدود | extraction sandbox, source isolation, human review |

## 12. قرار ما قبل البرمجة

```text
ARCHITECTURE_READINESS_PACK = ACCEPTED_FOR_PHASED_PROGRAMMING
PRODUCTION_SECURITY_READINESS = NOT_YET_ACCEPTED
MEDIA_PRODUCTION_FLOW = NOT_YET_ACCEPTED
AI_PRODUCTION_FLOW = NOT_YET_ACCEPTED
INTEGRATION_PRODUCTION_SYNC = NOT_YET_ACCEPTED
```

يسمح بالانتقال إلى البرمجة المرحلية إذا كان نطاق العمل لا يتجاوز هذه الحدود، وكل مهمة جديدة تحدد أي قسم من هذه الوثيقة يحكمها.
