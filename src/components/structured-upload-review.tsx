import type {
  StructuredUploadSection,
  StructuredUploadSectionValues,
} from "@/lib/structured-upload-sections";

type Props = {
  sections: StructuredUploadSection[];
  values: StructuredUploadSectionValues;
  extractedDraftText: string;
  reviewerNotes: string;
  onValuesChange: (values: StructuredUploadSectionValues) => void;
  onReviewerNotesChange: (value: string) => void;
};

export function StructuredUploadReview({
  sections,
  values,
  extractedDraftText,
  reviewerNotes,
  onValuesChange,
  onReviewerNotesChange,
}: Props) {
  function updateSection(sectionId: string, value: string) {
    onValuesChange({ ...values, [sectionId]: value });
  }

  return (
    <div className="md:col-span-2">
      <div className="rounded-lg border border-stone-200 bg-white p-3">
        <p className="text-xs font-bold text-[#0F3D3E]">قراءة الملف للمراجعة فقط</p>
        <textarea
          value={extractedDraftText}
          readOnly
          rows={4}
          className="mt-2 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm leading-7 text-stone-600 outline-none"
          placeholder="تظهر هنا البنود المقروءة آلياً عند توفرها. لا تعتمد وحدها دون تعبئة العناوين المهنية أدناه."
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        {sections.map((section) => (
          <div key={section.id}>
            <label className="mb-1 block text-xs font-semibold text-stone-500">
              {section.labelAr}
              {section.required && <span className="text-[#D9764A]"> *</span>}
            </label>
            <textarea
              value={values[section.id] ?? ""}
              onChange={(event) => updateSection(section.id, event.target.value)}
              rows={3}
              className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm leading-7 text-stone-800 outline-none focus:border-[#0F3D3E]"
              placeholder={section.placeholderAr}
            />
          </div>
        ))}
      </div>

      <label className="mt-3 mb-1 block text-xs font-semibold text-stone-500">ملاحظة المراجعة</label>
      <input
        type="text"
        value={reviewerNotes}
        onChange={(event) => onReviewerNotesChange(event.target.value)}
        className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 outline-none focus:border-[#0F3D3E]"
        placeholder="اختياري - سبب اعتماد البنود أو التصحيح"
      />
    </div>
  );
}
