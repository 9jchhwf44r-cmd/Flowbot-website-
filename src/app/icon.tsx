import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#050b16",
          borderRadius: 7,
        }}
      >
        <div
          style={{
            width: 14,
            height: 14,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #22d3ee, #6366f1)",
            boxShadow: "0 0 6px rgba(34,211,238,0.9)",
          }}
        />
      </div>
    ),
    { ...size }
  );
}
