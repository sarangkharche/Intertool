import { ImageResponse } from "next/og";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo";

export const alt = "Intertool private AI agent registry";
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
        background: "#0d1117",
        color: "#f8fafc",
        padding: "72px",
        fontFamily: "Inter, Arial, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "18px",
          fontSize: 34,
          fontWeight: 700,
        }}
      >
        <div
          style={{
            width: 54,
            height: 54,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 14,
            background: "#f8fafc",
            color: "#0d1117",
            fontSize: 30,
            fontWeight: 900,
          }}
        >
          I
        </div>
        {SITE_NAME}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        <div
          style={{
            maxWidth: 900,
            fontSize: 76,
            lineHeight: 1.02,
            fontWeight: 800,
            letterSpacing: 0,
          }}
        >
          Private AI agent registry for serious teams.
        </div>
        <div
          style={{
            maxWidth: 890,
            color: "#cbd5e1",
            fontSize: 30,
            lineHeight: 1.35,
          }}
        >
          {SITE_DESCRIPTION}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          gap: 16,
          color: "#94a3b8",
          fontSize: 24,
        }}
      >
        <span>Skills</span>
        <span>MCP servers</span>
        <span>Prompt templates</span>
        <span>CLI installs</span>
      </div>
    </div>,
    size
  );
}
