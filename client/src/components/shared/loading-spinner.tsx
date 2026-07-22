'use client';

interface LoadingSpinnerProps {
  size?: number;
  text?: string;
}

export function LoadingSpinner({ size = 56, text }: LoadingSpinnerProps) {
  return (
    <div className="flex h-[50vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          className="text-primary"
          style={{ overflow: 'visible' }}
        >
          {/* Static outer rounded square */}
          <rect
            x="5"
            y="5"
            width="90"
            height="90"
            rx="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            opacity="0.15"
          />
          {/* Rotating arc — short curve moves from bottom → left → top */}
          <path
            d="M 50,88 A 38,38 0 1,1 49.99,88"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray="72 167"
            className="animate-sweep"
          />
        </svg>
        {text && <p className="text-sm text-muted-foreground animate-pulse">{text}</p>}
      </div>
    </div>
  );
}
