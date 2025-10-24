import React from "react"

export type ColorSet = { base: string; dark: string; accent: string }

type ColorScheme = {
  default: ColorSet
  alert: ColorSet
  warn: ColorSet
  minor: ColorSet
}

export const baseColorScheme: ColorScheme = {
  default: { base: "#2d9f6f", dark: "#1a7a52", accent: "#2d8da0" },
  alert: { base: "#b83939", dark: "#8a2020", accent: "#b8396a" },
  warn: { base: "#d87a2d", dark: "#a55a1a", accent: "#d8b02d" },
  minor: { base: "#2d9fb8", dark: "#1a7a8a", accent: "#2d6fb8" },
}

const Marker = ({ color = baseColorScheme.default }: { color: ColorSet }) => {
  // useId ensures each SVG instance gets unique gradient ids to avoid DOM id collisions
  const uid = React.useId().replace(/[:]/g, "_")
  const gradA = `marker_grad_a_${uid}`
  const gradB = `marker_grad_b_${uid}`
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 140"
      width={30}
      height={36}
    >
      <ellipse cx="50" cy="135" fill="rgba(0,0,0,0.2)" rx="20" ry="5" />
      <path
        fill={`url(#${gradA})`}
        stroke={color.dark}
        strokeWidth="2"
        d="M50 10c-20 0-35 15-35 35 0 25 35 75 35 75s35-50 35-75c0-20-15-35-35-35Z"
      />
      <defs>
        <linearGradient id={gradA} x1="0%" x2="0%" y1="0%" y2="100%">
          <stop offset="0%" style={{ stopColor: color.base, stopOpacity: 1 }} />
          <stop
            offset="100%"
            style={{ stopColor: color.dark, stopOpacity: 1 }}
          />
        </linearGradient>
        <linearGradient id={gradB} x1="0%" x2="0%" y1="0%" y2="100%">
          <stop offset="0%" style={{ stopColor: color.base, stopOpacity: 1 }} />
          <stop
            offset="100%"
            style={{ stopColor: color.accent, stopOpacity: 1 }}
          />
        </linearGradient>
      </defs>
      <circle cx="50" cy="45" r="24" fill="#fff" />
      <g transform="translate(50 45)">
        <path fill={color.base} d="M-15-8q3-4 5 0l-1 6Z" />
        <path fill={color.accent} d="M-12-6q2-4 4-1l-1 5Z" />
        <path fill={color.dark} d="m-8 2 6-12L4 2Z" />
        <path fill={color.base} d="M2 2 8-8l6 10Z" />
        <path
          fill={`url(#${gradB})`}
          d="M-18 6q3-2 6 0t6 0 6 0 6 0 6 0 6 0v4h-36Z"
        />
        <circle cx="-4" cy="-4" r="1.5" fill="#fff" opacity=".8" />
        <circle cx="-2" cy="-4" r="1.5" fill="#fff" opacity=".8" />
        <circle cx="10" cy="-2" r="1.5" fill="#fff" opacity=".8" />
        <circle cx="12" cy="-2" r="1.5" fill="#fff" opacity=".8" />
      </g>
      <circle
        cx="50"
        cy="45"
        r="24"
        fill="none"
        stroke={color.base}
        strokeWidth="1.5"
        opacity=".6"
      >
        <animate
          attributeName="r"
          dur="2s"
          repeatCount="indefinite"
          values="24;28;24"
        />
        <animate
          attributeName="opacity"
          dur="2s"
          repeatCount="indefinite"
          values="0.6;0;0.6"
        />
      </circle>
    </svg>
  )
}

export default Marker
