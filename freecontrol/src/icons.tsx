import maskUrl from "../assets/brand-mask.png";

export function FreeControlIcon({ size = 16 }: { size?: number | string; strokeWidth?: number }) {
  return (
    <span
      className="fuyu-freecontrol__brand"
      style={{
        width: size,
        height: size,
        WebkitMaskImage: `url(${maskUrl})`,
        maskImage: `url(${maskUrl})`,
      }}
      aria-hidden="true"
    />
  );
}

export function UsbIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v12M8 7l4-4 4 4M12 15v6" />
      <circle cx="12" cy="20" r="2" />
      <path d="M8 12h8" />
    </svg>
  );
}

export function WifiIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0" />
      <circle cx="12" cy="20" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function RefreshIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6v5h-5M4 18v-5h5" />
      <path d="M18.5 9A7 7 0 0 0 6 6.5L4 11M5.5 15A7 7 0 0 0 18 17.5l2-4.5" />
    </svg>
  );
}
