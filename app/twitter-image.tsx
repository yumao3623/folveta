import { ImageResponse } from "next/og";

export const alt = "Folveta - source-grounded guides from PDFs and slides";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function TwitterImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        background: "#17221c",
        color: "white",
        padding: "78px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ fontSize: 28, fontWeight: 700, color: "#006d30" }}>Folveta</div>
      <div style={{ marginTop: 38, maxWidth: 980, fontSize: 76, lineHeight: 1.04, fontWeight: 700 }}>
        A clearer way to review your course materials
      </div>
      <div style={{ marginTop: 34, fontSize: 29, lineHeight: 1.4, color: "#cbd5cf" }}>
        Upload PDFs, Office files, or images. Get a structured Study Guide and optional Quick Check.
      </div>
    </div>,
    size,
  );
}
