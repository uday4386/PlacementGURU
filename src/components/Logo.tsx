import { GraduationCap } from 'lucide-react'
import { Link } from 'react-router-dom'

interface LogoProps {
  subtitle?: string
  className?: string
}

export function Logo({ subtitle, className = '' }: LogoProps) {
  return (
    <Link to="/" className={`flex items-center gap-2 ${className}`}>
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <GraduationCap className="h-5 w-5" />
      </div>
      <div>
        <div className="font-bold tracking-tight text-foreground text-lg">PlacePro</div>
        {subtitle && (
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{subtitle}</div>
        )}
      </div>
    </Link>
  )
}
