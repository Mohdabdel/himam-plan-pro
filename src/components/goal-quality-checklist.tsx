import { useState } from "react";
import { computeGoalQuality, summarizeQuality, type GoalQualityInput, type QualityItem, type QualityState } from "@/lib/goal-quality";

const STATE_LABEL: Record<QualityState, string> = {
  done: "مكتمل",
  needs: "يحتاج استكمال",
  advisory: "إرشادي",
};

const STATE_PALETTE: Record<QualityState, { bg: string; fg: string; icon: string }> = {
  done: { bg: "#F0FFF4", fg: "#15803D", icon: "✓" },
  needs: { bg: "#FFFBEB", fg: "#92400E", icon: "!" },
  advisory: { bg: "#E6F2F1", fg: "#0F3D3E", icon: "ⓘ" },
};

/**
 * Lightweight, collapsible goal-quality checklist for a single transition
 * goal. Informational only — states are done/needs/advisory, never a
 * numeric score. Hard-stop rows mirror the fields that actually block
 * saving the IEP (criterion, measurement method, linked evidence).
 */
export function GoalQualityChecklist(props: GoalQualityInput) {
  const [open, setOpen] = useState(false);
  const items = computeGoalQuality(props);
  const summary = summarizeQuality(items);
  const axis1 = items.filter((i) => i.axis === 1);
  const axis2 = items.filter((i) => i.axis === 2);

  return (
    <div style={{ border: "1px solid #E5E7EB", borderRadius: 10, overflow: "hidden", marginTop: 10 }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "10px 12px", background: "#F8FAFC", border: "none", cursor: "pointer",
          fontFamily: "inherit", fontSize: 12, fontWeight: 700, color: "#374151",
        }}
      >
        <span>
          مؤشرات جودة الهدف — {summary.done} مكتمل · {summary.needs} يحتاج استكمال · {summary.advisory} إرشادي
        </span>
        <span style={{ color: "#94A3B8" }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={{ padding: 14, background: "white", display: "flex", flexDirection: "column", gap: 14 }}>
          <p style={{ fontSize: 12, color: "#94A3B8", margin: 0 }}>
            قائمة إرشادية تُراجَع أثناء الكتابة — لا تُستخدم كتقييم رقمي نهائي.
          </p>
          <QualityAxisList title="المحور 1 — جودة الهدف الانتقالي" items={axis1} />
          <QualityAxisList title="المحور 2 — القياس والمتابعة المرتبطة بالهدف" items={axis2} />
        </div>
      )}
    </div>
  );
}

function QualityAxisList({ title, items }: { title: string; items: QualityItem[] }) {
  return (
    <div>
      <h4 style={{ fontSize: 11, fontWeight: 800, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 8 }}>
        {title}
      </h4>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {items.map((item, i) => (
          <QualityRow key={i} item={item} />
        ))}
      </div>
    </div>
  );
}

function QualityRow({ item }: { item: QualityItem }) {
  const palette = STATE_PALETTE[item.state];
  const blocked = item.hardStop && item.state === "needs" && !item.overridden;
  return (
    <div style={{ display: "flex", gap: 10, padding: "8px 10px", borderRadius: 8, background: "#F8FAFC" }}>
      <span
        style={{
          flexShrink: 0, width: 20, height: 20, borderRadius: "50%",
          background: palette.bg, color: palette.fg,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, fontWeight: 700,
        }}
      >
        {palette.icon}
      </span>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#1F2937" }}>
          {item.label} <span style={{ fontSize: 11, fontWeight: 700, color: palette.fg }}>— {STATE_LABEL[item.state]}</span>
        </div>
        {item.note && (
          <div style={{ fontSize: 12, color: item.overridden ? "#92400E" : "#64748B", fontWeight: item.overridden ? 700 : 400, marginTop: 2 }}>
            {item.note}
          </div>
        )}
        {blocked && (
          <div style={{ fontSize: 12, color: "#B91C1C", fontWeight: 700, marginTop: 2 }}>
            يمنع اعتماد هذا الهدف حتى استكماله
          </div>
        )}
      </div>
    </div>
  );
}
