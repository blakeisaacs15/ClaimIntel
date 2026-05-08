interface ClaimIntelLogoProps {
  size?: number;
  textClassName?: string;
  textSizeClassName?: string;
}

export default function ClaimIntelLogo({
  size = 32,
  textClassName = "text-gray-900",
  textSizeClassName = "text-xl",
}: ClaimIntelLogoProps) {
  return (
    <div className="flex items-center gap-2.5">
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M16 2L29 7V19.5C29 26 22.5 30.5 16 32C9.5 30.5 3 26 3 19.5V7L16 2Z"
          fill="#0d9488"
        />
        <rect x="9" y="21" width="3.5" height="5" rx="0.75" fill="white" />
        <rect x="14.25" y="17.5" width="3.5" height="8.5" rx="0.75" fill="white" />
        <rect x="19.5" y="14" width="3.5" height="12" rx="0.75" fill="white" />
      </svg>
      <span className={`font-bold tracking-tight ${textSizeClassName} ${textClassName}`}>
        ClaimIntel
      </span>
    </div>
  );
}
