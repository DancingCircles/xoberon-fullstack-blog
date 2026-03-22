import './Watermark.css'

interface WatermarkProps {
  lines?: [string, string, string]
  className?: string
}

const defaultLines: [string, string, string] = [
  'WORKS — ESSAYS — WORKS — ESSAYS — WORKS — ESSAYS —',
  'CREATIVE — CREATIVE — CREATIVE — CREATIVE —',
  'INSIGHTS — INSIGHTS — INSIGHTS — INSIGHTS —'
]

export default function Watermark({ lines = defaultLines, className = '' }: WatermarkProps) {
  return (
    <div className={`watermark ${className}`}>
      <div className="watermark__text watermark__text--1">{lines[0]}</div>
      <div className="watermark__text watermark__text--2">{lines[1]}</div>
      <div className="watermark__text watermark__text--3">{lines[2]}</div>
    </div>
  )
}
