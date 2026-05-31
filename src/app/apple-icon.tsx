import { ImageResponse } from "next/og";

// Apple touch icon — Apple only accepts raster formats, so generate a PNG.
// iOS rounds the corners itself, so we fill the full square with the brand
// gradient and center the "j" mark.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundImage:
            "linear-gradient(135deg, #a78bfa 0%, #6d5efc 55%, #5b4ef0 100%)",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 120,
            fontWeight: 700,
            color: "#ffffff",
            // optical centering for the lowercase j
            marginLeft: 6,
            marginBottom: 14,
          }}
        >
          j
        </div>
      </div>
    ),
    { ...size },
  );
}
