import './FloatingButton.css'

interface FloatingButtonProps {
  label: string
  onClick: () => void
  ariaLabel?: string
}

export default function FloatingButton({ label, onClick, ariaLabel }: FloatingButtonProps) {
  return (
    <button
      className="floating-create-btn"
      onClick={onClick}
      aria-label={ariaLabel ?? label}
    >
      <svg
        className="floating-btn-icon"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M12 5V19M5 12H19"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
      <span className="floating-btn-text">{label}</span>
    </button>
  )
}
