import { useId } from 'react'

interface AppIconProps {
  size?: number
  className?: string
}

export function BrandCrest({ size = 40, className }: AppIconProps) {
  const gradientId = useId()
  const strokeId = useId()
  const coreId = useId()

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect x="2" y="2" width="44" height="44" rx="16" fill={`url(#${gradientId})`} />
      <rect
        x="2"
        y="2"
        width="44"
        height="44"
        rx="16"
        stroke={`url(#${strokeId})`}
        strokeOpacity="0.75"
      />
      <circle cx="24" cy="24" r="14" fill={`url(#${coreId})`} fillOpacity="0.92" />
      <path
        d="M17.5 21.25C17.5 18.0744 20.0744 15.5 23.25 15.5H24.75C27.9256 15.5 30.5 18.0744 30.5 21.25V22.25C30.5 25.4256 27.9256 28 24.75 28H22.8594L19.3125 31.1484C18.8677 31.5432 18.1662 31.2274 18.1662 30.6327V27.246C17.7584 26.2968 17.5 25.2507 17.5 24.1445V21.25Z"
        fill="white"
      />
      <path
        d="M21 21.75H27"
        stroke="#6A56FF"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M21 24.75H25.5"
        stroke="#6A56FF"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M31.5 11.5L32.2476 13.7524L34.5 14.5L32.2476 15.2476L31.5 17.5L30.7524 15.2476L28.5 14.5L30.7524 13.7524L31.5 11.5Z"
        fill="#F7D37B"
      />
      <defs>
        <linearGradient id={gradientId} x1="6" y1="5" x2="43" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2A2157" />
          <stop offset="0.55" stopColor="#5D4BDE" />
          <stop offset="1" stopColor="#9A8AFF" />
        </linearGradient>
        <linearGradient id={strokeId} x1="5.5" y1="3.5" x2="41" y2="44.5" gradientUnits="userSpaceOnUse">
          <stop stopColor="white" />
          <stop offset="1" stopColor="#E1D9FF" />
        </linearGradient>
        <radialGradient id={coreId} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(24 23) rotate(90) scale(16)">
          <stop stopColor="#FFFFFF" stopOpacity="0.86" />
          <stop offset="1" stopColor="#DCCEFF" stopOpacity="0.28" />
        </radialGradient>
      </defs>
    </svg>
  )
}

export function LuxeBotIcon({ size = 20, className }: AppIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M9 3.75H15"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M12 3.75V6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <rect
        x="4.25"
        y="6.5"
        width="15.5"
        height="11.5"
        rx="5.25"
        fill="currentColor"
        fillOpacity="0.12"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M8.75 11.4H8.8"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M15.2 11.4H15.25"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M9.25 15.25C10.1 15.85 11 16.15 12 16.15C13 16.15 13.9 15.85 14.75 15.25"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M20.1 5.1L20.5089 6.3411L21.75 6.75L20.5089 7.1589L20.1 8.4L19.6911 7.1589L18.45 6.75L19.6911 6.3411L20.1 5.1Z"
        fill="#F4C86A"
      />
    </svg>
  )
}
