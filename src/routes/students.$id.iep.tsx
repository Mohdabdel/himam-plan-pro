import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { loadAssessmentRecords } from "@/lib/assessment-records";
import {
  buildCurrentPerformanceWorkspace,
  summarizeCurrentPerformanceWorkspace,
} from "@/lib/current-performance-workspace";
import {
  buildProcessedCurrentLevelRows,
  type ProcessedCurrentLevelRow,
} from "@/lib/current-level-draft";
import {
  buildInformationProcessingProfile,
  loadInformationRecords,
} from "@/lib/information-records";
import { buildLearnerProfileProcessingModel } from "@/lib/learner-profile-processing";
import { loadSourceFilePipelines } from "@/lib/source-file-pipeline";

export const Route = createFileRoute("/students/$id/iep")({
  component: PlanPreparationHubPage,
  head: () => ({
    meta: [
      { title: "إعداد الخطة التربوية الفردية - همم" },
      {
        name: "description",
        content: "فهرس مكونات إعداد الخطة التربوية الفردية قبل توليد الأهداف.",
      },
    ],
  }),
});

type StoredStudent = {
  id: string;
  name: string;
  birthDate?: string;
  ageYears?: number | null;
  diagnosis?: string;
  center?: string;
  learnerEntryType?: "new" | "returning";
  status?: string;
};

type ActiveSection = "basic" | "currentLevel" | "specialistVision";
type CurrentLevelRow = Pick<ProcessedCurrentLevelRow, "domainCode" | "strengths" | "needs"> & Partial<ProcessedCurrentLevelRow>;

type ComponentCard = {
  key: ActiveSection | "goals";
  title: string;
  body: string;
  status: string;
};

const TEAL = "#0F3D3E";
const ORANGE = "#D9764A";

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

const DOMAIN_NAMES: Record<string, string> = {
  VS: "المهارات المهنية",
  VB: "السلوكيات المهنية",
  IF: "الأداء الوظيفي المستقل",
  LS: "مهارات الترفيه",
  FC: "التواصل الوظيفي",
  IB: "السلوك البينشخصي",
  COG: "المهارات المعرفية",
  COM: "التواصل واللغة",
  SOC: "المهارات الاجتماعية",
  ADL: "مهارات الحياة اليومية",
  VOC: "التأهيل المهني",
  MOT: "المهارات الحركية",
};

function buildCurrentLevelRows(id: string): CurrentLevelRow[] {
  const saved = safeParse<{ currentLevelRows?: CurrentLevelRow[] }>(`himam_plan_preparation_${id}`);
  if (saved?.currentLevelRows?.length) return saved.currentLevelRows;
  const informationRecords = loadInformationRecords(id);
  const sourcePipelines = loadSourceFilePipelines(id);
  const profileProcessing = buildLearnerProfileProcessingModel({
    learnerId: id,
    informationRecords,
    sourcePipelines,
  });

  return buildProcessedCurrentLevelRows({
    assessmentRecords: loadAssessmentRecords(id),
    profileProcessing,
  });
}

function PlanPreparationHubPage() {
  const { id } = Route.useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const hubPath = `/students/${id}/iep`;
  const isHubPage = location.pathname === hubPath || location.pathname === `${hubPath}/`;

  const [student, setStudent] = useState<StoredStudent | null>(null);
  const [activeSection, setActiveSection] = useState<ActiveSection>("basic");
  const [specialistVision, setSpecialistVision] = useState("");
  const [currentLevelRows, setCurrentLevelRows] = useState<CurrentLevelRow[]>([]);
  const [savedMessage, setSavedMessage] = useState("");

  useEffect(() => {
    setStudent(loadStudent(id));
    const savedVision = safeParse<{ specialistVision?: string }>(`himam_plan_preparation_${id}`);
    if (savedVision?.specialistVision) setSpecialistVision(savedVision.specialistVision);
    setCurrentLevelRows(buildCurrentLevelRows(id));
  }, [id]);

  if (!isHubPage) {
    return <Outlet />;
  }

  const assessmentRecords = loadAssessmentRecords(id);
  const currentPerformanceSummary = summarizeCurrentPerformanceWorkspace(
    buildCurrentPerformanceWorkspace(loadSourceFilePipelines(id)),
  );
  const informationRecords = loadInformationRecords(id);
  const sourcePipelines = loadSourceFilePipelines(id);
  const informationProcessing = buildInformationProcessingProfile(informationRecords);
  const profileProcessing = buildLearnerProfileProcessingModel({
    learnerId: id,
    informationRecords,
    sourcePipelines,
  });
  const learnerVoice = safeParse(`himam_learner_voice_${id}`);
  const familyVoice = safeParse(`himam_family_${id}`);
  const additionalSources = safeParse(`himam_additional_sources_${id}`);

  const cards: ComponentCard[] = [
    {
      key: "basic",
      title: "البيانات الأساسية",
      body: "مراجعة اسم المتعلم، العمر، التشخيص، نوع المتعلم، والمركز أو المؤسسة قبل إعداد الخطة.",
      status: student?.name && typeof student.ageYears === "number" ? "مكتمل أساسياً" : "يحتاج مراجعة",
    },
    {
      key: "currentLevel",
      title: "مستوى الأداء الحالي",
      body: "عرض قراءة موحدة للتقييم الرسمي والأدوات والملفات، مع مسودات مستوى أداء وفرص أهداف قابلة للمراجعة.",
      status: currentPerformanceSummary.baselineReady
        ? `نتيجة مفسرة + ${profileProcessing.inputCount} مدخل`
        : "ينقصه تفسير رسمي",
    },
    {
      key: "specialistVision",
      title: "رؤية المختص للخطة التربوية الفردية",
      body: "مساحة مهنية يصوغ فيها المختص اتجاه الخطة قبل توليد الأهداف.",
      status: specialistVision.trim() ? "مدونة" : "غير مدونة",
    },
    {
      key: "goals",
      title: "توليد الأهداف",
      body: "يفتح صفحة مستقلة تجمع هيكلة توليد الأهداف مع شاشة الدعم المعرفي بجانبها.",
      status: currentPerformanceSummary.baselineReady ? "متاح" : "مغلق حتى تفسير التقييم",
    },
  ];

  function saveSpecialistVision() {
    localStorage.setItem(
      `himam_plan_preparation_${id}`,
      JSON.stringify({ specialistVision, currentLevelRows, savedAt: new Date().toISOString() }),
    );
    setSavedMessage("تم حفظ رؤية المختص كمسودة قابلة للمراجعة البشرية.");
  }

  function saveCurrentLevelRows() {
    localStorage.setItem(
      `himam_plan_preparation_${id}`,
      JSON.stringify({ specialistVision, currentLevelRows, savedAt: new Date().toISOString() }),
    );
    setSavedMessage("تم حفظ مستوى الأداء الحالي كمكوّن قابل للمراجعة في الخطة.");
  }

  function updateCurrentLevelRow(index: number, field: "domainCode" | "domainNameAr" | "strengths" | "needs", value: string) {
    setCurrentLevelRows((rows) => rows.map((row, rowIndex) => (
      rowIndex === index
        ? {
            ...row,
            [field]: value,
            ...(field === "domainNameAr" ? { domainCode: value.trim() || row.domainCode } : {}),
          }
        : row
    )));
  }

  function addCurrentLevelRow() {
    setCurrentLevelRows((rows) => [
      ...rows,
      {
        domainCode: `custom-domain-${rows.length + 1}`,
        domainNameAr: "",
        strengths: "",
        needs: "",
        sourceSummaryAr: "مجال حر أضافه المختص؛ لا توجد معالجة آلية مرتبطة به بعد.",
        proposedByPlatform: false,
      },
    ]);
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2]" dir="rtl" lang="ar">
      <header className="flex items-center justify-between px-8 py-4" style={{ backgroundColor: TEAL }}>
        <Link
          to="/students/$id/coverage"
          params={{ id }}
          className="rounded-lg border border-white/30 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
        >
          رجوع
        </Link>
        <h1 className="text-2xl font-bold text-white">همم</h1>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8 md:px-8">
        <nav aria-label="مسار الصفحة" className="mb-2.5 flex flex-wrap items-center gap-1.5 text-xs text-stone-400">
          <Link to="/" className="font-bold text-stone-600 underline">لوحة المتعلمين</Link>
          <span>←</span>
          <span>{student?.name ?? "المتعلم"}</span>
          <span>←</span>
          <Link to="/students/$id/coverage" params={{ id }} className="font-bold text-stone-600 underline">
            مراجعة كفاية المعلومات
          </Link>
          <span>←</span>
          <span className="font-bold text-[#0F3D3E]">إعداد الخطة</span>
        </nav>

        <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-bold" style={{ color: ORANGE }}>إعداد الخطة التربوية الفردية</p>
          <h2 className="mt-1 text-2xl font-bold text-[#0F3D3E]">إعداد الخطة التربوية الفردية</h2>
          <div className="mt-5">
            <label className="mb-1 block text-xs font-semibold text-stone-500">مكونات الخطة</label>
            <select
              value={activeSection}
              onChange={(event) => {
                if (event.target.value === "goals") {
                  if (currentPerformanceSummary.baselineReady) navigate({ to: "/students/$id/iep/goals", params: { id } });
                  else navigate({ to: "/students/$id/coverage", params: { id } });
                  return;
                }
                setActiveSection(event.target.value as ActiveSection);
              }}
              className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm font-bold text-stone-800 outline-none focus:border-[#0F3D3E]"
            >
              {cards.map((card) => (
                <option key={card.key} value={card.key}>
                  {card.title} {card.status.includes("مكتمل") || card.status.includes("مدونة") || card.status.includes("متاح") ? "✓" : ""}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="mt-5 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          {activeSection === "basic" && <BasicDataSection student={student} />}
          {activeSection === "currentLevel" && (
            <CurrentLevelSection
              assessmentCount={assessmentRecords.length}
              interpretedAssessmentCount={currentPerformanceSummary.currentPerformanceCueCount}
              processedSignalCount={informationProcessing.signalCount}
              evidenceCandidateCount={informationProcessing.evidenceCandidateCount}
              goalSelectionSignalCount={informationProcessing.goalSelectionSignalCount}
              processedProfileInputCount={profileProcessing.inputCount}
              goalOpportunityCount={profileProcessing.topGoalOpportunities.length}
              profileReadiness={profileProcessing.profileReadiness}
              learnerVoice={Boolean(learnerVoice)}
              familyVoice={Boolean(familyVoice)}
              additionalSources={Boolean(additionalSources)}
              rows={currentLevelRows}
              onUpdateRow={updateCurrentLevelRow}
              onAddRow={addCurrentLevelRow}
              onSave={saveCurrentLevelRows}
              savedMessage={savedMessage}
            />
          )}
          {activeSection === "specialistVision" && (
            <SpecialistVisionSection
              value={specialistVision}
              onChange={setSpecialistVision}
              onSave={saveSpecialistVision}
              savedMessage={savedMessage}
            />
          )}
        </section>
      </main>
    </div>
  );
}

function BasicDataSection({ student }: { student: StoredStudent | null }) {
  const rows = [
    ["اسم المتعلم", student?.name ?? "غير مدخل"],
    ["العمر", typeof student?.ageYears === "number" ? `${student.ageYears} سنة` : "غير مدخل"],
    ["التشخيص", student?.diagnosis || "غير مدخل"],
    ["نوع المتعلم", student?.learnerEntryType === "returning" ? "متعلم سابق" : student?.learnerEntryType === "new" ? "متعلم جديد" : "غير محدد"],
    ["المركز أو المؤسسة", student?.center || "غير مدخل"],
  ];

  return (
    <div>
      <h3 className="text-lg font-bold text-[#0F3D3E]">البيانات الأساسية</h3>
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-stone-200 bg-stone-50 p-4">
            <div className="text-xs font-bold text-stone-500">{label}</div>
            <div className="mt-1 text-sm font-semibold text-stone-800">{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CurrentLevelSection(props: {
  assessmentCount: number;
  interpretedAssessmentCount: number;
  processedSignalCount: number;
  evidenceCandidateCount: number;
  goalSelectionSignalCount: number;
  processedProfileInputCount: number;
  goalOpportunityCount: number;
  profileReadiness: string;
  learnerVoice: boolean;
  familyVoice: boolean;
  additionalSources: boolean;
  rows: CurrentLevelRow[];
  onUpdateRow: (index: number, field: "domainCode" | "domainNameAr" | "strengths" | "needs", value: string) => void;
  onAddRow: () => void;
  onSave: () => void;
  savedMessage: string;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const domainOptions = Array.from(new Map([
    ...props.rows.map((row) => [row.domainCode, row.domainNameAr || DOMAIN_NAMES[row.domainCode] || row.domainCode] as const),
    ...Object.entries(DOMAIN_NAMES),
  ]).entries());
  const detailRows = [
    ["التقييم الرسمي", props.assessmentCount > 0 ? `${props.assessmentCount} سجل محفوظ` : "غير مكتمل"],
    ["نتائج مفسرة مراجعة", props.interpretedAssessmentCount > 0 ? `${props.interpretedAssessmentCount} بطاقة قابلة للتتبع` : "غير متاحة بعد"],
    ["معالجة أدوات المعلومات", props.processedSignalCount > 0 ? `${props.processedSignalCount} إشارة بروفايل معالجة` : "لا توجد إشارات بعد"],
    ["قراءة البروفايل الموحدة", props.processedProfileInputCount > 0 ? `${props.processedProfileInputCount} مدخل مصنف - ${props.profileReadiness}` : "غير متاحة بعد"],
    ["مرشحات دليل أداء", props.evidenceCandidateCount > 0 ? `${props.evidenceCandidateCount} مرشح يحتاج تفسير مختص` : "لا يوجد مرشح بعد"],
    ["إشارات توجيه الأهداف", props.goalSelectionSignalCount > 0 ? `${props.goalSelectionSignalCount} إشارة أولوية/دعم/احتياج` : "غير متاحة بعد"],
    ["فرص أهداف مستخرجة", props.goalOpportunityCount > 0 ? `${props.goalOpportunityCount} فرصة قابلة للمراجعة` : "لا توجد فرص بعد"],
    ["صوت المتعلم", props.learnerVoice ? "متاح ويدخل في معالجة البروفايل" : "غير موثق"],
    ["صوت الأسرة", props.familyVoice ? "متاح ويدخل في معالجة البروفايل" : "غير موثق"],
    ["مصادر إضافية", props.additionalSources ? "متاحة وتدخل في معالجة البروفايل" : "غير موثقة"],
  ];

  return (
    <div>
      <h3 className="text-lg font-bold text-[#0F3D3E]">مستوى الأداء الحالي</h3>
      <p className="mt-2 text-sm leading-7 text-stone-600">
        النقاط التالية مسودة مقترحة أعدتها المنصة بعد معالجة نتائج التقييم الرسمي وبقية مصادر جمع المعلومات. المجالات المعروضة تبدأ من مجالات أداة التقييم الرسمية عند توفرها، ويمكن للمختص تعديل اسم المجال أو إضافة مجال حر وبناء مستوى الأداء الحالي ذاتياً.
      </p>
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
        <SummaryMetric label="سجلات تقييم رسمي" value={props.assessmentCount} />
        <SummaryMetric label="بطاقات أداء مفسرة" value={props.interpretedAssessmentCount} />
        <SummaryMetric label="إشارات معالجة" value={props.processedSignalCount} />
        <SummaryMetric label="فرص أهداف" value={props.goalOpportunityCount} />
      </div>
      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead>
            <tr className="bg-[#E6F2F1] text-right text-[#0F3D3E]">
              <th className="border border-stone-200 px-3 py-2">المجال</th>
              <th className="border border-stone-200 px-3 py-2">نقاط القوة</th>
              <th className="border border-stone-200 px-3 py-2">نقاط الاحتياج</th>
            </tr>
          </thead>
          <tbody>
            {props.rows.map((row, index) => (
              <tr key={`${row.domainCode}-${index}`}>
                <td className="border border-stone-200 p-2 align-top">
                  <input
                    list="current-level-domain-options"
                    value={row.domainNameAr || DOMAIN_NAMES[row.domainCode] || row.domainCode}
                    onChange={(event) => props.onUpdateRow(index, "domainNameAr", event.target.value)}
                    className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 outline-none focus:border-[#0F3D3E]"
                    placeholder="اكتب المجال أو اختره من المقترحات"
                  />
                  <datalist id="current-level-domain-options">
                    {domainOptions.map(([code, name]) => (
                      <option key={code} value={name} />
                    ))}
                  </datalist>
                  {row.sourceSummaryAr && (
                    <p className="mt-2 rounded-lg bg-stone-50 px-2 py-1 text-[11px] leading-5 text-stone-500">
                      {row.sourceSummaryAr}
                    </p>
                  )}
                </td>
                <td className="border border-stone-200 p-2 align-top">
                  <textarea
                    value={row.strengths}
                    onChange={(event) => props.onUpdateRow(index, "strengths", event.target.value)}
                    rows={4}
                    className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm leading-7 text-stone-800 outline-none focus:border-[#0F3D3E]"
                    placeholder="نقاط القوة المستخلصة من التقييم الرسمي وبقية مصادر جمع المعلومات..."
                  />
                </td>
                <td className="border border-stone-200 p-2 align-top">
                  <textarea
                    value={row.needs}
                    onChange={(event) => props.onUpdateRow(index, "needs", event.target.value)}
                    rows={4}
                    className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm leading-7 text-stone-800 outline-none focus:border-[#0F3D3E]"
                    placeholder="نقاط الاحتياج أو المهارات الناشئة المستخلصة من التقييم الرسمي وبقية المصادر..."
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 rounded-xl border border-[#9EC7C3] bg-[#F4FAF9] p-4">
        <button
          type="button"
          onClick={() => setDetailsOpen((open) => !open)}
          title="استدعاء آلية إنشاء مستوى الأداء والملف التفصيلي"
          className="flex w-full items-center justify-between gap-3 text-right text-sm font-bold text-[#0F3D3E]"
        >
          <span>استدعاء الملف التفصيلي لمعالجة مصادر المعلومات وآلية إنشاء مستوى الأداء</span>
          <span>{detailsOpen ? "▲" : "▼"}</span>
        </button>
        {detailsOpen && (
          <div className="mt-4 space-y-4">
            <div className="rounded-xl border border-[#9EC7C3] bg-white p-4">
              <p className="text-sm font-bold text-[#0F3D3E]">كيف أنشئت المسودة؟</p>
              <ol className="mt-2 list-decimal space-y-1 pr-5 text-xs leading-6 text-stone-600">
                <li>تبدأ المنصة من مجالات أداة التقييم الرسمية المحفوظة عند توفرها.</li>
                <li>تجمع نتائج التقييم الرسمي والملفات المراجعة وأدوات صوت الأسرة والمتعلم وبقية مصادر المعلومات.</li>
                <li>تصنف المدخلات إلى نقاط قوة ونقاط احتياج وأولويات وشروط دعم ودلائل أداء.</li>
                <li>توزع المدخلات المصنفة على المجالات الأقرب، ثم تعرضها كمسودة قابلة للتعديل أو الاستبعاد.</li>
                <li>يمكن للمختص تعديل اسم أي مجال أو إضافة مجال حر وبناء المحتوى ذاتياً.</li>
              </ol>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {detailRows.map(([label, value]) => (
                <div key={label} className="rounded-xl border border-stone-200 bg-white p-4">
                  <div className="text-xs font-bold text-stone-500">{label}</div>
                  <div className="mt-1 text-sm font-semibold text-stone-800">{value}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={props.onAddRow}
          className="rounded-lg border border-[#9EC7C3] bg-white px-4 py-2 text-sm font-bold text-[#0F3D3E] transition hover:bg-[#F4FAF9]"
        >
          إضافة مجال حر
        </button>
        <button
          type="button"
          onClick={props.onSave}
          className="rounded-lg bg-[#0F3D3E] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#0b2f30]"
        >
          حفظ مستوى الأداء الحالي
        </button>
        {props.savedMessage && <span className="text-sm font-bold text-emerald-700">{props.savedMessage}</span>}
      </div>
    </div>
  );
}

function SummaryMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
      <div className="text-xs font-bold text-stone-500">{label}</div>
      <div className="mt-1 text-xl font-black text-[#0F3D3E]">{value}</div>
    </div>
  );
}

function SpecialistVisionSection(props: {
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  savedMessage: string;
}) {
  return (
    <div>
      <h3 className="text-lg font-bold text-[#0F3D3E]">رؤية المختص للخطة التربوية الفردية</h3>
      <p className="mt-2 text-sm leading-7 text-stone-600">
        تستخدم هذه الرؤية كمسودة مهنية توجه بناء الأهداف، ولا تعد اعتماداً نهائياً للخطة.
      </p>
      <textarea
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        rows={6}
        className="mt-4 w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm leading-7 text-stone-800 outline-none focus:border-[#0F3D3E]"
        placeholder="اكتب رؤية المختص للخطة، الأولويات المهنية، والسياقات التي يجب مراعاتها عند توليد الأهداف..."
      />
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={props.onSave}
          className="rounded-lg bg-[#0F3D3E] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#0b2f30]"
        >
          حفظ المسودة
        </button>
        {props.savedMessage && <span className="text-sm font-semibold text-emerald-700">{props.savedMessage}</span>}
      </div>
    </div>
  );
}
