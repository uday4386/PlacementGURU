import { Link } from 'react-router-dom'

interface LogoProps {
  subtitle?: string
  className?: string
}

export function Logo({ subtitle, className = '' }: LogoProps) {
  return (
    <Link to="/" className={`flex items-center gap-2 ${className}`}>
      <img
        src="/placego-logo.png"
        alt="PlaceGO!"
        className="h-9 w-9 rounded-lg object-contain"
      />
      <div>
        <div className="font-bold tracking-tight text-foreground text-lg">PlaceGO!</div>
        {subtitle && (
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{subtitle}</div>
        )}
      </div>
    </Link>
  )
}

