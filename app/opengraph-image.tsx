import { ImageResponse } from "next/og";

export const alt = "Folveta - turn PDFs and slides into a clear Study Guide";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#f3f6f4",
        color: "#17221c",
        padding: "72px 78px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 28, fontWeight: 700, color: "#176b4d" }}>
        <div style={{ width: 18, height: 18, background: "#176b4d", borderRadius: 4 }} />
        Folveta
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 28, maxWidth: 980 }}>
        <div style={{ fontSize: 74, lineHeight: 1.04, fontWeight: 700 }}>
          Turn PDFs and slides into a clear Study Guide
        </div>
        <div style={{ fontSize: 30, lineHeight: 1.35, color: "#536159" }}>
          Organized topics, study priorities, source gaps, and an optional Quick Check.
        </div>
      </div>
      <div style={{ display: "flex", gap: 16, fontSize: 24, color: "#536159" }}>
        <span>PDF</span><span>+</span><span>Office</span><span>+</span><span>Images</span><span>-&gt;</span><span>Study Guide</span>
      </div>
    </div>,
    size,
  );
}
