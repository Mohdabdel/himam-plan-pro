import type { InformationToolDefinition } from "@/data/information-tools";
import {
  createInformationRecord,
  updateInformationResponse,
} from "@/lib/information-records";
import type { InformationRecord } from "@/types/himam";

type Props = {
  learnerId: string;
  tools: InformationToolDefinition[];
  selectedToolId: string;
  record: InformationRecord | null;
  onSelectedToolIdChange: (toolId: string) => void;
  onRecordChange: (record: InformationRecord | null) => void;
};

function responseHasValue(value: string | string[]) {
  return Array.isArray(value)
    ? value.some((item) => item.trim().length > 0)
    : value.trim().length > 0;
}

function toggleMultiSelect(value: string | string[], option: string) {
  const values = Array.isArray(value) ? value : [];
  return values.includes(option)
    ? values.filter((item) => item !== option)
    : [...values, option];
}

export function InformationToolApplication({
  learnerId,
  tools,
  selectedToolId,
  record,
  onSelectedToolIdChange,
  onRecordChange,
}: Props) {
  const selectedTool = tools.find((tool) => tool.id === selectedToolId);
  const answeredCount = record?.responses.filter((response) => responseHasValue(response.value)).length ?? 0;

  function selectTool(toolId: string) {
    onSelectedToolIdChange(toolId);
    onRecordChange(toolId ? createInformationRecord({ learnerId, toolId }) : null);
  }

  function updateResponse(questionId: string, value: string | string[]) {
    if (!record) return;
    onRecordChange(updateInformationResponse(record, questionId, value));
  }

  return (
    <div className="mt-4 rounded-xl border border-[#9EC7C3] bg-white p-4">
      <label className="mb-1 block text-xs font-semibold text-stone-500">الأداة المراد تطبيقها داخل المنصة</label>
      <select
        value={selectedToolId}
        onChange={(event) => selectTool(event.target.value)}
        className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 outline-none focus:border-[#0F3D3E]"
      >
        <option value="">اختر الأداة</option>
        {tools.map((tool) => (
          <option key={tool.id} value={tool.id}>{tool.nameAr}</option>
        ))}
      </select>

      {selectedTool && record && (
        <div className="mt-4 space-y-4">
          <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
            <p className="text-sm font-bold text-[#0F3D3E]">{selectedTool.nameAr}</p>
            <p className="mt-1 text-xs leading-6 text-stone-600">{selectedTool.descriptionAr}</p>
            <p className="mt-2 text-xs font-bold text-[#D9764A]">
              {answeredCount} من {record.responses.length} بنود مدخلة كمحتوى وصفي داعم
            </p>
          </div>

          {record.responses.map((response) => {
            const question = selectedTool.questions.find((item) => item.id === response.questionId);
            if (!question) return null;

            return (
              <div key={response.questionId} className="rounded-lg border border-stone-200 bg-white p-3">
                <label className="block text-sm font-bold leading-7 text-[#0F3D3E]">{response.promptAr}</label>
                {question.responseType === "text" && (
                  <textarea
                    value={typeof response.value === "string" ? response.value : response.value.join("، ")}
                    onChange={(event) => updateResponse(response.questionId, event.target.value)}
                    rows={3}
                    className="mt-2 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm leading-7 text-stone-800 outline-none focus:border-[#0F3D3E]"
                  />
                )}
                {question.responseType === "single_select" && (
                  <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                    {(question.options ?? []).map((option) => (
                      <label key={option} className="flex items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-700">
                        <input
                          type="radio"
                          name={`${record.id}-${response.questionId}`}
                          checked={response.value === option}
                          onChange={() => updateResponse(response.questionId, option)}
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                )}
                {question.responseType === "multi_select" && (
                  <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                    {(question.options ?? []).map((option) => (
                      <label key={option} className="flex items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-700">
                        <input
                          type="checkbox"
                          checked={Array.isArray(response.value) && response.value.includes(option)}
                          onChange={() => updateResponse(response.questionId, toggleMultiSelect(response.value, option))}
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
