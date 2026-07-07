/**
 * Well-known branch name → abbreviation mappings.
 * Any branch NOT in this list will get an auto-generated abbreviation.
 */
const KNOWN_MAPPINGS: Record<string, string> = {
  'COMPUTER SCIENCE ENGINEERING': 'CSE',
  'COMPUTER SCIENCE AND ENGINEERING': 'CSE',
  'COMPUTER SCIENCE ENGINEERING- DATA SCIENCE': 'CSE-DS',
  'COMPUTER SCIENCE ENGINEERING-DATA SCIENCE': 'CSE-DS',
  'COMPUTER SCIENCE AND ENGINEERING- DATA SCIENCE': 'CSE-DS',
  'COMPUTER SCIENCE AND ENGINEERING-DATA SCIENCE': 'CSE-DS',
  'COMPUTER SCIENCE ENGINEERING-ARTIFICIAL INTELLIGENCE': 'CSE-AI',
  'COMPUTER SCIENCE AND ENGINEERING-ARTIFICIAL INTELLIGENCE': 'CSE-AI',
  'COMPUTER SCIENCE ENGINEERING-MACHINE LEARNING': 'CSE-ML',
  'COMPUTER SCIENCE AND ENGINEERING-MACHINE LEARNING': 'CSE-ML',
  'INFORMATION TECHNOLOGY': 'IT',
  'ELECTRONICS AND COMMUNICATION ENGINNERING': 'ECE',
  'ELECTRONICS AND COMMUNICATION ENGINEERING': 'ECE',
  'ELECTRICAL AND ELECTRONICS ENINNERING': 'EEE',
  'ELECTRICAL AND ELECTRONICS ENGINEERING': 'EEE',
  'MECHANICAL ENGINEERING': 'ME',
  'CIVIL ENGINEERING': 'CE',
  'CHEMICAL ENGINEERING': 'CHE',
  'BIOMEDICAL ENGINEERING': 'BME',
  'BIOTECHNOLOGY': 'BT',
  'AEROSPACE ENGINEERING': 'AE',
  'AUTOMOBILE ENGINEERING': 'AUTO',
  'MINING ENGINEERING': 'MINING',
  'METALLURGICAL ENGINEERING': 'MET',
  'PETROLEUM ENGINEERING': 'PET',
  'AGRICULTURAL ENGINEERING': 'AGR',
  'INSTRUMENTATION ENGINEERING': 'IE',
  'PRODUCTION ENGINEERING': 'PE',
  'INDUSTRIAL ENGINEERING': 'IND',
  'TEXTILE ENGINEERING': 'TE',
  'ENVIRONMENTAL ENGINEERING': 'ENV',
  'COMPUTER ENGINEERING': 'COMP',
  'SOFTWARE ENGINEERING': 'SE',
  'ELECTRONICS AND INSTRUMENTATION ENGINEERING': 'EIE',
  'ELECTRONICS AND TELECOMMUNICATION ENGINEERING': 'ETC',
  'ELECTRONICS ENGINEERING': 'EE',
  'ELECTRICAL ENGINEERING': 'EE',
}

/**
 * Keyword-based fallback patterns checked in order.
 * More specific patterns must come before generic ones.
 */
const KEYWORD_PATTERNS: Array<{ keywords: string[]; short: string }> = [
  { keywords: ['DATA SCIENCE'], short: 'CSE-DS' },
  { keywords: ['MACHINE LEARNING'], short: 'CSE-ML' },
  { keywords: ['ARTIFICIAL INTELLIGENCE'], short: 'CSE-AI' },
  { keywords: ['COMPUTER SCIENCE'], short: 'CSE' },
  { keywords: ['INFORMATION TECHNOLOGY'], short: 'IT' },
  { keywords: ['COMMUNICATION', 'ENGINEERING'], short: 'ECE' },
  { keywords: ['ELECTRICAL', 'ELECTRONICS'], short: 'EEE' },
  { keywords: ['MECHANICAL'], short: 'ME' },
  { keywords: ['CIVIL'], short: 'CE' },
  { keywords: ['BIOMEDICAL'], short: 'BME' },
  { keywords: ['BIOTECHNOLOGY'], short: 'BT' },
  { keywords: ['CHEMICAL'], short: 'CHE' },
  { keywords: ['AEROSPACE'], short: 'AE' },
  { keywords: ['AUTOMOBILE'], short: 'AUTO' },
  { keywords: ['INSTRUMENTATION'], short: 'IE' },
  { keywords: ['TELECOMMUNICATION'], short: 'ETC' },
  { keywords: ['SOFTWARE'], short: 'SE' },
]

/** Words to skip when auto-generating an abbreviation */
const STOP_WORDS = new Set([
  'AND', 'OF', 'THE', 'IN', 'FOR', 'WITH', 'ON', 'AT', 'TO', 'FROM', 'BY',
])

/**
 * Auto-generates an abbreviation from a branch name by taking
 * the first letter of each significant word.
 * e.g. "Petroleum Engineering" → "PE"
 *      "Computer Science Engineering-Cyber Security" → "CSE-CS"
 */
function autoAbbreviate(name: string): string {
  const upper = name.toUpperCase().trim()

  // Handle hyphenated sub-branches like "Computer Science Engineering-Cyber Security"
  const parts = upper.split(/[-–]/).map((p) => p.trim()).filter(Boolean)
  if (parts.length > 1) {
    // Abbreviate each part separately and join with '-'
    return parts.map((part) => {
      const words = part.split(/\s+/).filter((w) => !STOP_WORDS.has(w) && w.length > 0)
      return words.map((w) => w[0]).join('')
    }).join('-')
  }

  // Single part: take first letter of each significant word
  const words = upper.split(/\s+/).filter((w) => !STOP_WORDS.has(w) && w.length > 0)
  if (words.length === 0) return name
  if (words.length === 1) return words[0] // already short, return as-is
  return words.map((w) => w[0]).join('')
}

/**
 * Convert any branch name to its short abbreviation.
 * Works for the 7 predefined branches AND any unknown branch.
 * If input is already a known abbreviation (e.g. "CSE"), returns it unchanged.
 */
export function getShortBranchName(branch: string): string {
  const b = (branch || '').toUpperCase().trim()
  if (!b || b === '-') return branch

  // 1. Check if it's already a known short form (CSE, IT, ECE, etc.)
  const allShorts = new Set(Object.values(KNOWN_MAPPINGS))
  if (allShorts.has(b)) return b

  // 2. Check exact match in known mappings (normalized)
  // Normalize by collapsing whitespace around hyphens
  const normalized = b.replace(/\s*[-–]\s*/g, '-').replace(/\s+/g, ' ')
  if (KNOWN_MAPPINGS[b]) return KNOWN_MAPPINGS[b]
  if (KNOWN_MAPPINGS[normalized]) return KNOWN_MAPPINGS[normalized]

  // 3. Try keyword pattern matching
  for (const pattern of KEYWORD_PATTERNS) {
    if (pattern.keywords.every((kw) => b.includes(kw))) {
      return pattern.short
    }
  }

  // 4. Auto-generate abbreviation for unknown branches
  return autoAbbreviate(b)
}

/**
 * Check whether a student's branch matches a coordinator's assigned department.
 */
export function matchesBranch(studentBranch: string, coordBranch: string): boolean {
  const sb = getShortBranchName(studentBranch)
  const cb = getShortBranchName(coordBranch)
  return sb === cb
}

/**
 * The default well-known branch options for dropdowns.
 * Each entry has a full `value` (the canonical department name) and a display `label`.
 */
export const DEFAULT_BRANCH_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'Computer Science Engineering', label: 'Computer Science Engineering (CSE)' },
  { value: 'Computer Science Engineering- Data Science', label: 'CSE - Data Science (CSE-DS)' },
  { value: 'Computer Science Engineering-ARTIFICIAL INTELLIGENCE', label: 'CSE - Artificial Intelligence (CSE-AI)' },
  { value: 'Computer Science Engineering-MACHINE LEARNING', label: 'CSE - Machine Learning (CSE-ML)' },
  { value: 'INFORMATION TECHNOLOGY', label: 'Information Technology (IT)' },
  { value: 'ELECTRONICS AND COMMUNICATION ENGINNERING', label: 'Electronics and Communication (ECE)' },
  { value: 'ELECTRICAL AND ELECTRONICS ENINNERING', label: 'Electrical and Electronics (EEE)' },
  { value: 'Mechanical Engineering', label: 'Mechanical Engineering (ME)' },
  { value: 'Civil Engineering', label: 'Civil Engineering (CE)' },
]

/**
 * Build a merged list of branch options from the defaults + any extra branches
 * discovered in master data. Extra branches are auto-abbreviated and appended.
 */
export function getAllBranchOptions(
  masterBranches: string[] = []
): Array<{ value: string; label: string }> {
  const options = [...DEFAULT_BRANCH_OPTIONS]
  const existingShorts = new Set(options.map((o) => getShortBranchName(o.value)))

  for (const rawBranch of masterBranches) {
    const trimmed = (rawBranch || '').trim()
    if (!trimmed || trimmed === '-') continue

    const short = getShortBranchName(trimmed)
    if (!existingShorts.has(short)) {
      existingShorts.add(short)
      // Capitalize for display
      const displayName = trimmed
        .split(/\s+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ')
      options.push({ value: trimmed, label: `${displayName} (${short})` })
    }
  }

  return options
}

/**
 * Build a simple list of short branch names for compact dropdowns
 * (used in manual add student / manual placement forms).
 */
export function getAllShortBranches(masterBranches: string[] = []): string[] {
  const shorts = new Set<string>(['CSE', 'CSE-DS', 'CSE-AI', 'CSE-ML', 'IT', 'ECE', 'EEE'])

  for (const rawBranch of masterBranches) {
    const trimmed = (rawBranch || '').trim()
    if (!trimmed || trimmed === '-') continue
    shorts.add(getShortBranchName(trimmed))
  }

  return Array.from(shorts)
}
