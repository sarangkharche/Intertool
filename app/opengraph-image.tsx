import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/seo";

export const alt =
  "Intertool governed engineering memory for teams and enterprises";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#faf9f6",
        color: "#090909",
        padding: "72px",
        fontFamily: "Geist, Arial, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "18px",
          fontSize: 30,
          fontWeight: 600,
        }}
      >
        <div
          style={{
            width: 54,
            height: 54,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 10,
            border: "1px solid #e9e6df",
            background: "#f5f3ee",
            color: "#2169df",
            fontSize: 26,
            fontWeight: 700,
          }}
        >
          I
        </div>
        {SITE_NAME}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        <div
          style={{
            maxWidth: 930,
            fontSize: 74,
            lineHeight: 0.98,
            fontWeight: 650,
            letterSpacing: 0,
          }}
        >
          Engineering memory for every team and every coding agent.
        </div>
        <div
          style={{
            maxWidth: 890,
            color: "#4b4b49",
            fontSize: 27,
            lineHeight: 1.4,
          }}
        >
          Start with one repository. Scale reviewed, source-backed context
          across an organisation with permissions and control intact.
        </div>
      </div>
      <div
        style={{
          display: "flex",
          gap: 16,
          color: "#4b4b49",
          fontSize: 22,
        }}
      >
        <span>Human published</span>
        <span>Tenant isolated</span>
        <span>Role-aware</span>
        <span>Lifecycle recorded</span>
      </div>
    </div>,
    size
  );
}
