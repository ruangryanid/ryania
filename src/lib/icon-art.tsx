import { ImageResponse } from "next/og";

/** App icon drawn with plain shapes (no font dependency). `pad` leaves the maskable safe zone. */
export function renderIcon(size: number, pad = 0.18) {
  const inner = size * (1 - pad * 2);
  const bar = (h: number) => ({
    width: inner * 0.17,
    height: inner * h,
    borderRadius: inner * 0.06,
    background: "white",
  });
  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(145deg, #34c3ff 0%, #007aff 55%, #5856d6 100%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-end", gap: inner * 0.1, height: inner * 0.62 }}>
          <div style={bar(0.34)} />
          <div style={bar(0.52)} />
          <div style={bar(0.78)} />
        </div>
      </div>
    ),
    { width: size, height: size },
  );
}
