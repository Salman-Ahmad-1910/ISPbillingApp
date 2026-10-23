'use client';

interface IdBallProps {
  value: string | number | null | undefined;
  label?: string;
}

export function IdBall({ value, label = 'ID' }: IdBallProps) {
  const text = String(value ?? '');
  const sizeClass = text.length <= 3 ? 'text-sm' : text.length <= 8 ? 'text-[10px]' : 'text-[8px]';
  return (
    <div
      className={`relative inline-flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-green-800 via-green-600 to-green-400 px-1 text-center font-bold leading-tight text-white ring-1 ring-green-900/40 shadow-[inset_0_1px_1px_rgba(255,255,255,0.45),inset_0_-2px_4px_rgba(0,0,0,0.35),0_3px_6px_rgba(0,0,0,0.3)] ${sizeClass}`}
      title={`${label}: ${text}`}
    >
      <span className="pointer-events-none absolute left-3 top-1.5 h-2.5 w-2.5 rounded-full bg-white/50 blur-[1px]" aria-hidden />
      <span className="relative line-clamp-2 w-full break-all drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]">{text}</span>
    </div>
  );
}
