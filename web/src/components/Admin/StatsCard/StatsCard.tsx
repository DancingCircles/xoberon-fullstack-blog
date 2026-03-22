import { type ReactNode } from 'react'
import './StatsCard.css'

interface StatsCardProps {
  icon: ReactNode
  label: string
  value: number | string
  trend?: string
  valueColor?: string
}

export default function StatsCard({ icon, label, value, trend, valueColor }: StatsCardProps) {
  return (
    <div className="stats-card">
      <div className="stats-card__icon">{icon}</div>
      <span className="stats-card__label">{label}</span>
      <span
        className="stats-card__value"
        style={valueColor ? { color: valueColor } : undefined}
      >
        {value}
      </span>
      {trend && <span className="stats-card__trend">{trend}</span>}
    </div>
  )
}
