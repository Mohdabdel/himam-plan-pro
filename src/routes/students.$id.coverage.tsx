import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { loadAssessmentRecords } from "@/lib/assessment-records";
import {
  buildCurrentPerformanceWorkspace,
  summarizeCurrentPerformanceWorkspace,
  type CurrentPerformanceCard,
} from "@/lib/current-performance-workspace";
import { advanceStage } from "@/lib/journey";
import {
  coverageAreaLabelAr,
  isDevelopmentalAssessmentUnder9,
} from "@/lib/information-source-review";
import {
  buildInformationProcessingProfile,
  loadInformationRecords,
} from "@/lib/information-records";
import { buildLearnerProfileProcessingModel } from "@/lib/learner-profile-processing";
import { getConceptNameAr } from "@/data/concepts";
import { PlanComponentsStatus } from "@/components/plan-components-status";
import { loadPlanComponentStatus } from "@/components/plan-components-status-store";
import { loadSourceFilePipelines } from "@/lib/source-file-pipeline";
import type { AssessmentRecord, InformationProcessingProfile, LearnerProfileProcessingModel } from "@/types/himam";

export const Route = createFileRoute("/students/$id/coverage")({
  component: InformationSufficiencyPage,
  head: () => ({
    meta: [
      { title: "مراجعة كفاية المعلومات ومستوى الأداء الحالي - همم" },
      {
        name: "description",
        content: "مراجعة إرشادية لكفاية مصادر المعلومات قبل إعداد الخطة التربوية الفردية.",
      },
    ],
  }),
});

type StoredStudent = {
  id: string;
  name: string;
  center?: string;
  ageYears?: number | null;
  ageBand?: "UNDER_14" | "AGE_14_PLUS";
  status?: string;
  diagnosis?: string;
  tool?: string;
};

type SourceSnapshot = {
  learnerVoice: boolean;
  familyVoice: boolean;
  additionalSources: boolean;
};

type RecommendationLevel = "blocking" | "quality" | "enrichment";

type Recommendation = {
  level: RecommendationLevel;
  title: string;
  body: string;
};

const LEVEL_STYLE: Record<RecommendationLevel, { label: string; className: string }> = {
  blocking: {
    label: "مانع تشغيلي",
    className: "border-red-200 bg-red-50 text-red-800",
  },
  quality: {
    label: "توصية جودة مؤثرة",
    className: "border-amber-200 bg-amber-50 text-amber-800",
  },
  enrichment: {
    label: "تحسين مقترح",
    className: "border-teal-200 bg-teal-50 text-teal-800",
  },
};

function safeParse<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function loadStudent(id: string): StoredStudent | null {
  const list = safeParse<StoredStudent[]>("himam_students") ?? [];
  return list.find((item) => item.id === id) ?? null;
}

function markCoverageReady(id: string) {
  const list = safeParse<StoredStudent[]>("himam_students") ?? [];
  localStorage.setItem(
    "himam_students",
    JSON.stringify(
      list.map((item) => (
        item.id === id
          ? { ...item, status: advanceStage(item.status ?? "draft", "coverage_ready") }
          : item
      )),
    ),
  );
}

function loadSourceSnapshot(id: string): SourceSnapshot {
  return {
    learnerVoice: Boolean(safeParse(`himam_learner_voice_${id}`)),
    familyVoice: Boolean(safeParse(`himam_family_${id}`)),
    additionalSources: Boolean(safeParse(`himam_additional_sources_${id}`)),
  };
}

function uniqueList(items: Array<string | undefined>) {
  return Array.from(new Set(items.filter(Boolean) as string[]));
}

function getMissingTransitionAreas(records: AssessmentRecord[]) {
  return uniqueList(records.flatMap((record) => record.transitionCoverageMissingAreas ?? []));
}

function hasUploadedAssessment(records: AssessmentRecord[]) {
  return records.some((record) => Boolean(record.uploadedFileName));
}

function buildRecommendations(input: {
  student: StoredStudent | null;
  records: AssessmentRecord[];
  sources: SourceSnapshot;
  hasReviewedOfficialAssessment: boolean;
}): Recommendation[] {
  const { student, records, sources, hasReviewedOfficialAssessment } = input;
  const ageYears = student?.ageYears;
  const age14Plus = student?.ageBand === "AGE_14_PLUS" || (typeof ageYears === "number" && ageYears >= 14);
  const recommendations: Recommendation[] = [];

  if (typeof ageYears !== "number") {
    recommendations.push({
      level: "blocking",
      title: "العمر غير مكتمل",
      body: "يلزم إدخال عمر المتعلم أو تاريخ ميلاده قبل مراجعة كفاية المعلومات، لأن العمر يغير نوع التوصيات وليس مستوى المتعلم آلياً.",
    });
  }

  if (records.length === 0 || !hasUploadedAssessment(records)) {
    recommendations.push({
      level: "blocking",
      title: "مصدر التقييم الرسمي غير مكتمل",
      body: "يلزم تحديد أداة تقييم رسمية ورفع نتائجها على الأقل قبل الانتقال لإعداد الخطة.",
    });
  }

  if (!hasReviewedOfficialAssessment) {
    recommendations.push({
      level: "blocking",
      title: "نتائج التقييم الرسمي لم تفسر بعد",
      body: "الحد الأدنى لا يتحقق بمجرد رفع الملف. يجب مراجعة مسودة قراءة نتائج التقييم وتحويل نتيجة مفسرة واحدة على الأقل إلى استجابة منظمة قابلة للتتبع قبل توليد الأهداف.",
    });
  }

  if (!sources.learnerVoice) {
    recommendations.push({
      level: "quality",
      title: "صوت المتعلم غير موثق بعد",
      body: "غياب صوت المتعلم لا يوقف المسار، لكنه يقلل جودة صياغة الأولويات والدافعية والدعم المعرفي عند إعداد الأهداف.",
    });
  }

  if (!sources.familyVoice) {
    recommendations.push({
      level: "quality",
      title: "صوت الأسرة غير موثق بعد",
      body: "غياب رؤية الأسرة لا يوقف المسار، لكنه يقلل وضوح الأولويات المنزلية والسياقات اليومية التي يجب أن تظهر في مستوى الأداء الحالي.",
    });
  }

  if (age14Plus) {
    const missingAreas = getMissingTransitionAreas(records);
    if (missingAreas.length > 0) {
      recommendations.push({
        level: "quality",
        title: "مراجعة تغطية التخطيط للانتقال لعمر 14 فأكثر",
        body: `هذه توصية غير مانعة: يفضّل استكمال معلومات انتقالية حول ${missingAreas
          .map((area) => coverageAreaLabelAr(area as Parameters<typeof coverageAreaLabelAr>[0]))
          .join("، ")} قبل بناء الأهداف النهائية.`,
      });
    } else {
      recommendations.push({
        level: "enrichment",
        title: "تم تفعيل حساسية العمر الانتقالية",
        body: "عمر المتعلم يستدعي حضوراً أوضح للتخطيط للانتقال في مراجعة المعلومات وشاشة إعداد الأهداف، دون أن ينتج ذلك مستوى آلياً أو يمنع التقدم.",
      });
    }
  }

  if (!sources.additionalSources) {
    recommendations.push({
      level: "enrichment",
      title: "مصادر إضافية قابلة للاستكمال",
      body: "يمكن تعزيز مستوى الأداء الحالي بأدوات مسح اهتمامات أو ميول أو قوائم انتقال عند الحاجة، خصوصاً إذا لم تغط نتائج التقييم الرسمي كل المجالات المهمة.",
    });
  }

  const developmentalUnder9Tools = records.filter((record) => (
    isDevelopmentalAssessmentUnder9({
      ageYears: ageYears ?? null,
      selectedToolId: record.toolId,
    })
  ));
  if (developmentalUnder9Tools.length > 0) {
    recommendations.push({
      level: "quality",
      title: "تقييم نمائي لعمر أقل من 9 سنوات",
      body: "تعامل نتائج هذه الأداة كمدخل نمائي يؤثر لاحقاً في ترشيح المنهج والدروس، ولا يعامل كتخطيط انتقال مباشر.",
    });
  }

  return recommendations;
}

function InformationSufficiencyPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState<StoredStudent | null>(null);
  const [records, setRecords] = useState<AssessmentRecord[]>([]);
  const [sources, setSources] = useState<SourceSnapshot>({
    learnerVoice: false,
    familyVoice: false,
    additionalSources: false,
  });
  const [showGateMessage, setShowGateMessage] = useState(false);
  const [componentStatus, setComponentStatus] = useState(() => loadPlanComponentStatus(id));
  const [currentPerformanceCards, setCurrentPerformanceCards] = useState<CurrentPerformanceCard[]>([]);
  const [informationProcessing, setInformationProcessing] = useState<InformationProcessingProfile>(
    () => buildInformationProcessingProfile([]),
  );
  const [profileProcessing, setProfileProcessing] = useState<LearnerProfileProcessingModel>(
    () => buildLearnerProfileProcessingModel({ learnerId: id, informationRecords: [], sourcePipelines: [] }),
  );

  useEffect(() => {
    const loadedStudent = loadStudent(id);
    setStudent(loadedStudent);
    setRecords(loadAssessmentRecords(id));
    setSources(loadSourceSnapshot(id));
    const loadedPipelines = loadSourceFilePipelines(id);
    const loadedInformationRecords = loadInformationRecords(id);
    setCurrentPerformanceCards(buildCurrentPerformanceWorkspace(loadedPipelines));
    setInformationProcessing(buildInformationProcessingProfile(loadedInformationRecords));
    setProfileProcessing(buildLearnerProfileProcessingModel({
      learnerId: id,
      informationRecords: loadedInformationRecords,
      sourcePipelines: loadedPipelines,
    }));
    setComponentStatus(loadPlanComponentStatus(id));
  }, [id]);

  const currentPerformanceSummary = useMemo(
    () => summarizeCurrentPerformanceWorkspace(currentPerformanceCards),
    [currentPerformanceCards],
  );

  const recommendations = useMemo(() => (
    buildRecommendations({
      student,
      records,
      sources,
      hasReviewedOfficialAssessment: currentPerformanceSummary.baselineReady,
    })
  ), [student, records, sources, currentPerformanceSummary.baselineReady]);

  const blockers = recommendations.filter((item) => item.level === "blocking");
  const qualityItems = recommendations.filter((item) => item.level === "quality");
  const enrichmentItems = recommendations.filter((item) => item.level === "enrichment");
  const canProceed = blockers.length === 0;

  function handleNext() {
    if (!canProceed) {
      setShowGateMessage(true);
      return;
    }
    markCoverageReady(id);
    navigate({ to: "/students/$id/iep", params: { id } });
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2]" dir="rtl" lang="ar">
      <header className="flex items-center justify-between px-8 py-4" style={{ backgroundColor: "#0F3D3E" }}>
        <Link
          to="/students/$id/assessment/additional"
          params={{ id }}
          className="rounded-lg border border-white/30 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
        >
          رجوع
        </Link>
        <h1 className="text-2xl font-bold text-white">همم</h1>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8 md:px-8">
        <nav aria-label="مسار الصفحة" className="mb-2.5 flex flex-wrap items-center gap-1.5 text-xs text-stone-400">
          <Link to="/" className="font-bold text-stone-600 underline">لوحة المتعلمين</Link>
          <span>←</span>
          <span>{student?.name ?? "المتعلم"}</span>
          <span>←</span>
          <Link to="/students/$id/assessment" params={{ id }} className="font-bold text-stone-600 underline">مصادر جمع المعلومات</Link>
          <span>←</span>
          <span className="font-bold text-[#0F3D3E]">مراجعة كفاية المعلومات ومستوى الأداء الحالي</span>
        </nav>

        <PlanComponentsStatus learnerId={id} current="currentLevel" status={componentStatus} />

        <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-bold text-[#D9764A]">قبل إعداد الخطة</p>
          <h2 className="mt-1 text-2xl font-bold text-[#0F3D3E]">مراجعة كفاية المعلومات ومستوى الأداء الحالي</h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-stone-600">
            هذه الصفحة تجمع حالة مصادر المعلومات المدخلة وتعرض توصيات مهنية قبل الانتقال إلى إعداد الخطة. لا تنشئ مستوى آلياً، ولا تعتمد الخطة، ولا تنفذ معايرة Stage 4.
          </p>
        </section>

        <section className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          <StatusCard
            title="البيانات الأساسية"
            status={typeof student?.ageYears === "number" ? "مكتمل أساسياً" : "غير مكتمل"}
            body={student ? `${student.name}${typeof student.ageYears === "number" ? `، العمر ${student.ageYears} سنة` : ""}${student.diagnosis ? `، التشخيص: ${student.diagnosis}` : ""}` : "لم يتم العثور على سجل المتعلم."}
          />
          <StatusCard
            title="التقييم الرسمي"
            status={records.length > 0 && hasUploadedAssessment(records) ? "مكتمل أساسياً" : "يحتاج استكمال"}
            body={records.length > 0 ? `${records.length} سجل تقييم محفوظ، ${hasUploadedAssessment(records) ? "وتوجد نتيجة مرفوعة." : "لكن لا توجد نتيجة مرفوعة بعد."}` : "لم يتم حفظ أداة تقييم رسمية بعد."}
          />
          <StatusCard
            title="صوت المتعلم"
            status={sources.learnerVoice ? "موثق" : "غير موثق"}
            body={sources.learnerVoice ? "سيظهر كمعلومة داعمة للأولويات والصياغة." : "يعرض كتوصية جودة ولا يمنع المسار."}
          />
          <StatusCard
            title="صوت الأسرة"
            status={sources.familyVoice ? "موثق" : "غير موثق"}
            body={sources.familyVoice ? "سيظهر كمعلومة داعمة للسياق والأولويات." : "يعرض كتوصية جودة ولا يمنع المسار."}
          />
          <StatusCard
            title="أدوات ومصادر إضافية"
            status={sources.additionalSources ? "موثقة" : "اختيارية حالياً"}
            body={sources.additionalSources ? "تدخل في معالجة بروفايل المتعلم كإشارات احتياج ودعم وأولوية قابلة للمراجعة." : "يمكن استكمالها عند الحاجة لتغطية فجوات محددة."}
          />
          <StatusCard
            title="حساسية العمر"
            status={student?.ageBand === "AGE_14_PLUS" || (typeof student?.ageYears === "number" && student.ageYears >= 14) ? "تخطيط انتقال مفعل توصياً" : "مسار عام"}
            body="العمر يفعّل توصيات ونطاق مراجعة، ولا يغير مستوى المتعلم أو يمنع تنفيذ المسار وحده."
          />
        </section>

        <section className="mt-5 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-[#D9764A]">معالجة أدوات المعلومات</p>
              <h3 className="mt-1 text-lg font-bold text-[#0F3D3E]">إشارات بروفايل من المسوح والقوائم غير الرسمية</h3>
            </div>
            <span className="rounded-full bg-[#E6F2F1] px-3 py-1 text-xs font-bold text-[#0F3D3E]">
              {informationProcessing.processingStage === "medium_profile_processing"
                ? "معالجة متوسطة"
                : informationProcessing.processingStage === "initial_structured_processing"
                  ? "معالجة وصفية أولية"
                  : "لا توجد إشارات بعد"}
            </span>
          </div>

          <p className="mt-2 max-w-3xl text-sm leading-7 text-stone-600">
            أدوات المسح والقوائم غير الرسمية لا تحفظ كتعليقات فقط؛ تعالج كإشارات بروفايل تساعد في فهم الاحتياجات والأولويات والدعم والسياق، ثم تُراجع مهنياً عند بناء مستوى الأداء والأهداف.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
            <MetricBox label="أدوات مطبقة" value={informationProcessing.recordCount} />
            <MetricBox label="إشارات معالجة" value={informationProcessing.signalCount} />
            <MetricBox label="مرشحات دليل أداء" value={informationProcessing.evidenceCandidateCount} />
            <MetricBox label="إشارات توجه الأهداف" value={informationProcessing.goalSelectionSignalCount} />
          </div>

          {informationProcessing.conceptSummaries.length > 0 && (
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              {informationProcessing.conceptSummaries.slice(0, 6).map((summary) => (
                <article key={summary.conceptId} className="rounded-xl border border-stone-200 bg-stone-50 p-4">
                  <p className="text-sm font-bold text-[#0F3D3E]">{getConceptNameAr(summary.conceptId)}</p>
                  <p className="mt-1 text-xs leading-6 text-stone-600">
                    {summary.signalCount} إشارات، منها {summary.evidenceCandidateCount} مرشحات دليل، {summary.priorityHintCount} أولوية، و{summary.supportConditionCount} شرط دعم.
                  </p>
                  <p className="mt-1 text-[11px] leading-5 text-stone-500">
                    المصادر: {summary.sourceToolNamesAr.slice(0, 3).join("، ")}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="mt-5 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-[#D9764A]">بروفايل تشغيل قابل للمراجعة</p>
              <h3 className="mt-1 text-lg font-bold text-[#0F3D3E]">قراءة موحدة من الأدوات والملفات</h3>
            </div>
            <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-bold text-stone-700">
              {profileProcessing.profileReadiness === "profile_ready_for_goal_review"
                ? "جاهز لمراجعة الأهداف"
                : profileProcessing.profileReadiness === "processed_information_available"
                  ? "معلومات معالجة متاحة"
                  : "لا توجد معالجة بعد"}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
            <MetricBox label="مدخلات مصنفة" value={profileProcessing.inputCount} />
            <MetricBox label="ملفات مراجعة" value={profileProcessing.reviewedUploadedSourceCount} />
            <MetricBox label="أدوات مطبقة" value={profileProcessing.platformToolRecordCount} />
            <MetricBox label="فرص أهداف" value={profileProcessing.topGoalOpportunities.length} />
          </div>

          {profileProcessing.conceptProfiles.length === 0 ? (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-800">
              لم تتكون بعد قراءة بروفايل من أدوات أو ملفات مراجعة. طبق أداة أو ارفع مصدراً ثم راجعه لتظهر مسودات مستوى الأداء وفرص الأهداف.
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {profileProcessing.conceptProfiles.slice(0, 5).map((profile) => (
                <article key={profile.conceptId} className="rounded-xl border border-stone-200 bg-stone-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-bold text-[#0F3D3E]">{profile.conceptNameAr}</p>
                    <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-stone-600">
                      تغطية {profile.coverage} / ثقة {profile.confidence}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-7 text-stone-700">{profile.currentPerformanceDraftAr}</p>
                  {profile.goalOpportunities.length > 0 && (
                    <p className="mt-2 text-xs leading-6 text-stone-500">
                      فرصة هدف أولى: {profile.goalOpportunities[0].rationaleAr}
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="mt-5 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-[#D9764A]">نتيجة المراجعة</p>
              <h3 className="mt-1 text-lg font-bold text-[#0F3D3E]">توصيات كفاية المعلومات</h3>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${canProceed ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>
              {canProceed ? "جاهز للانتقال مع التوصيات" : "يتطلب استكمال الحد الأدنى"}
            </span>
          </div>

          {recommendations.length === 0 ? (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-7 text-emerald-800">
              مصادر المعلومات الأساسية مكتملة، ويمكن الانتقال إلى إعداد الخطة مع بقاء قرار الصياغة والاعتماد بشرياً.
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {[...blockers, ...qualityItems, ...enrichmentItems].map((item) => {
                const style = LEVEL_STYLE[item.level];
                return (
                  <article key={`${item.level}-${item.title}`} className={`rounded-xl border p-4 ${style.className}`}>
                    <div className="mb-1 text-xs font-bold">{style.label}</div>
                    <h4 className="font-bold">{item.title}</h4>
                    <p className="mt-1 text-sm leading-7">{item.body}</p>
                  </article>
                );
              })}
            </div>
          )}

          {showGateMessage && !canProceed && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-7 text-red-800">
              لا يمكن الانتقال لإعداد الخطة قبل إدخال العمر ووجود أداة تقييم رسمية محفوظة بنتيجة مرفوعة.
              كما يجب أن تكون نتيجة تقييم رسمية واحدة على الأقل مفسرة ومراجعة كاستجابة منظمة.
            </div>
          )}
        </section>

        <section className="mt-5 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-[#D9764A]">مستوى الأداء الحالي</p>
              <h3 className="mt-1 text-lg font-bold text-[#0F3D3E]">بطاقات أداء وسياق من مصادر مرفوعة ومراجعة</h3>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${currentPerformanceSummary.baselineReady ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
              {currentPerformanceSummary.baselineReady ? "يوجد مدخل baseline قابل للتتبع" : "لا يوجد baseline مراجع بعد"}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
            <MetricBox label="دلائل أداء حالي" value={currentPerformanceSummary.currentPerformanceCueCount} />
            <MetricBox label="معلومات سياقية" value={currentPerformanceSummary.contextSupportCount} />
            <MetricBox label="فجوات ملف" value={currentPerformanceSummary.completionGapCount} />
          </div>

          {currentPerformanceCards.length === 0 ? (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-800">
              لا توجد بعد ملفات مرفوعة ومراجعة يمكن تحويلها إلى بطاقات أداء أو سياق. ارفع مصدر التقييم الرسمي أو مصدر معلومات ثم راجع مسودة القراءة.
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {currentPerformanceCards.slice(0, 8).map((card) => (
                <article key={card.cardId} className="rounded-xl border border-stone-200 bg-stone-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-bold text-[#0F3D3E]">{card.sourceNameAr}</p>
                    <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-stone-600">
                      {card.kind === "CURRENT_PERFORMANCE_CUE"
                        ? "أداء حالي"
                        : card.kind === "CONTEXT_SUPPORT"
                          ? "سياق داعم"
                          : "فجوة استكمال"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-7 text-stone-700">{card.statement}</p>
                  <p className="mt-2 text-xs leading-6 text-stone-500">
                    المصدر: {card.provenanceLabel} - {card.canSupportGoalBaseline ? "يمكن مراجعته كخط أساس لهدف" : "لا يكفي وحده كخط أساس"}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="mt-5 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <h3 className="text-base font-bold text-[#0F3D3E]">مدخل شاشة الدعم المعرفي التالية</h3>
          <p className="mt-2 text-sm leading-7 text-stone-600">
            عند الانتقال لإعداد الخطة، ستُنقل هذه الصفحة كملخص داعم: مصادر مثبتة، معلومات ناقصة، توصيات جودة، وتنبيهات عمرية. كل ذلك يبقى معلومات داعمة للمختص ولا يتحول إلى اعتماد آلي أو مستوى أداء نهائي.
          </p>
        </section>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <Link
            to="/students/$id/assessment/additional"
            params={{ id }}
            className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-bold text-stone-700 transition hover:bg-stone-50"
          >
            رجوع
          </Link>
          <button
            type="button"
            onClick={handleNext}
            className="rounded-lg bg-[#0F3D3E] px-5 py-2 text-sm font-bold text-white transition hover:bg-[#0b2f30]"
          >
            الانتقال إلى إعداد الخطة
          </button>
        </div>
      </main>
    </div>
  );
}

function StatusCard(props: { title: string; status: string; body: string }) {
  return (
    <article className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-bold text-[#0F3D3E]">{props.title}</h3>
        <span className="shrink-0 rounded-full bg-stone-100 px-2.5 py-1 text-[11px] font-bold text-stone-600">
          {props.status}
        </span>
      </div>
      <p className="mt-2 text-sm leading-7 text-stone-600">{props.body}</p>
    </article>
  );
}

function MetricBox(props: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
      <p className="text-2xl font-bold text-[#0F3D3E]">{props.value}</p>
      <p className="mt-1 text-xs font-bold text-stone-500">{props.label}</p>
    </div>
  );
}
