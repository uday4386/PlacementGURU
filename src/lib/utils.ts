import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getBranchAbbreviation(branch: string): string {
  if (!branch) return ''
  const normalized = branch.trim().toUpperCase()
  if (
    normalized.includes('MACHINE LEARNING') ||
    normalized.includes('ML')
  ) {
    return 'CSE-ML'
  }
  if (
    normalized.includes('DATA SCIENCE') ||
    normalized.includes('DS')
  ) {
    return 'CSE-DS'
  }
  if (
    normalized === 'COMPUTER SCIENCE & ENGINEERING' ||
    normalized === 'COMPUTER SCIENCE AND ENGINEERING' ||
    normalized === 'COMPUTER SCIENCE ENGINEERING' ||
    normalized === 'CSE' ||
    normalized === 'COMPUTER SCIENCE'
  ) {
    return 'CSE'
  }
  if (normalized === 'INFORMATION TECHNOLOGY' || normalized === 'IT') {
    return 'IT'
  }
  if (
    normalized === 'ELECTRONICS & COMMUNICATION ENGINEERING' ||
    normalized === 'ELECTRONICS AND COMMUNICATION ENGINEERING' ||
    normalized === 'ECE'
  ) {
    return 'ECE'
  }
  if (
    normalized === 'ELECTRICAL & ELECTRONICS ENGINEERING' ||
    normalized === 'ELECTRICAL AND ELECTRONICS ENGINEERING' ||
    normalized === 'EEE'
  ) {
    return 'EEE'
  }
  if (normalized === 'ELECTRICAL ENGINEERING' || normalized === 'EE') {
    return 'EE'
  }
  if (normalized === 'MECHANICAL ENGINEERING' || normalized === 'ME') {
    return 'ME'
  }
  if (normalized === 'CIVIL ENGINEERING' || normalized === 'CE') {
    return 'CE'
  }
  return normalized
}

export function matchesDepartment(branch: string, department: string): boolean {
  if (!branch || !department) return false
  const branchAbbr = getBranchAbbreviation(branch).toUpperCase()
  const dept = department.toUpperCase()
  return branchAbbr === dept || branchAbbr.startsWith(dept + '-')
}

