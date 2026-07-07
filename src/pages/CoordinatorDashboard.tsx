import {
  BarChart3,
  Bell,
  Briefcase,
  FileText,
  GraduationCap,
  Users,
} from 'lucide-react'
import { Outlet } from 'react-router-dom'
import { DashboardLayout } from '../components/DashboardLayout'
import { getAuthSession } from '../lib/auth'

export function CoordinatorLayout() {
  const session = getAuthSession()
  const deptName = session?.department || 'Department'

  const navItems = [
    { label: 'Dashboard', href: '/coordinator', icon: BarChart3 },
    { label: 'Students', href: '/coordinator/students', icon: Users },
    { label: 'Placements', href: '/coordinator/placements', icon: Briefcase },
    { label: 'Eligibility', href: '/coordinator/eligibility', icon: GraduationCap },
    { label: 'Broadcasts', href: '/coordinator/notifications', icon: Bell },
    { label: 'Reports', href: '/coordinator/reports', icon: FileText },
  ]



  return (
    <DashboardLayout
      portal="coordinator"
      navItems={navItems}
      userInitials="CO"
      userRole="coordinator"
      userEmail={session?.email ?? 'coordinator@college.edu'}
      department={deptName}
    >
      <Outlet />
    </DashboardLayout>
  )
}
