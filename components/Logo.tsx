/* eslint-disable @next/next/no-img-element */
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <img
      src="/icons/icon-192.png"
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      className="shrink-0"
      style={{ width: size, height: size }}
    />
  );
}

export function Wordmark() {
  return (
    <span className="flex items-center gap-2">
      <LogoMark />
      <span className="text-lg font-semibold tracking-tight">CupTune</span>
    </span>
  );
}
