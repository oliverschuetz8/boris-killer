export type PackageCode =
  | 'PKG-BCGO'
  | 'PKG-ELEC'
  | 'PKG-JOIN'
  | 'PKG-PLUMB-MECH'
  | 'PKG-PLUMB-SPRINKLER'
  | 'PKG-CRANE'
  | 'PKG-PREMIX'

export type EmploymentType = 'full_time' | 'part_time' | 'casual'

export type DayOfWeek =
  | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday'
  | 'saturday' | 'sunday'

export interface PayCalcInput {
  packageCode: PackageCode
  employmentType: EmploymentType
  baseHourlyRate: number
  dayOfWeek: DayOfWeek
  isPublicHoliday: boolean
  hoursWorked: number
  standardDailyHours: number
  startHour?: number // 0-24, used for Saturday noon rule
}

export interface PayCalcResult {
  ordinaryHours: number
  ordinaryPay: number
  overtimeHours: number
  overtimePay: number
  totalPay: number
  breakdown: string
}

// ─── Minimum engagement rules (hours) ───────────────────────────────────────

function getMinimumEngagement(
  pkg: PackageCode,
  day: DayOfWeek,
  isPublicHoliday: boolean
): number {
  if (isPublicHoliday) {
    return pkg === 'PKG-BCGO' || pkg === 'PKG-JOIN' ? 4
      : pkg === 'PKG-ELEC' ? 4
      : pkg === 'PKG-PLUMB-MECH' || pkg === 'PKG-PLUMB-SPRINKLER' ? 4
      : pkg === 'PKG-CRANE' ? 4
      : pkg === 'PKG-PREMIX' ? 4
      : 4
  }
  if (day === 'sunday') {
    return pkg === 'PKG-BCGO' ? 4
      : pkg === 'PKG-JOIN' ? 4
      : pkg === 'PKG-ELEC' ? 4
      : pkg === 'PKG-PLUMB-MECH' || pkg === 'PKG-PLUMB-SPRINKLER' ? 4
      : pkg === 'PKG-CRANE' ? 4
      : pkg === 'PKG-PREMIX' ? 4
      : 4
  }
  if (day === 'saturday') {
    return pkg === 'PKG-BCGO' ? 3
      : pkg === 'PKG-JOIN' ? 3
      : pkg === 'PKG-ELEC' ? 4
      : pkg === 'PKG-PLUMB-MECH' || pkg === 'PKG-PLUMB-SPRINKLER' ? 3
      : pkg === 'PKG-CRANE' ? 4
      : pkg === 'PKG-PREMIX' ? 4
      : 3
  }
  return 0
}

// ─── Weekday overtime multipliers ───────────────────────────────────────────

function weekdayOvertimeMultiplier(
  pkg: PackageCode,
  employmentType: EmploymentType,
  overtimeHourIndex: number // 0-based index of this overtime hour
): number {
  const casual = employmentType === 'casual'

  switch (pkg) {
    case 'PKG-BCGO':
    case 'PKG-JOIN':
      // 150% first 2 OT hrs, then 200%
      return overtimeHourIndex < 2 ? 1.5 : 2.0

    case 'PKG-ELEC':
      if (casual) return overtimeHourIndex < 2 ? 1.875 : 2.5
      return overtimeHourIndex < 2 ? 1.5 : 2.0

    case 'PKG-PLUMB-MECH':
    case 'PKG-PLUMB-SPRINKLER':
      if (casual) return overtimeHourIndex < 2 ? 1.75 : 2.25
      return overtimeHourIndex < 2 ? 1.5 : 2.0

    case 'PKG-CRANE':
      // Mon–Sat first 2 OT hrs 150%, then 200%
      return overtimeHourIndex < 2 ? 1.5 : 2.0

    case 'PKG-PREMIX':
      if (casual) return overtimeHourIndex < 2 ? 1.75 : 2.25
      return overtimeHourIndex < 2 ? 1.5 : 2.0

    default:
      return overtimeHourIndex < 2 ? 1.5 : 2.0
  }
}

// ─── Saturday multipliers ────────────────────────────────────────────────────

function saturdayMultiplier(
  pkg: PackageCode,
  employmentType: EmploymentType,
  overtimeHourIndex: number,
  isAfterNoon: boolean
): number {
  const casual = employmentType === 'casual'

  switch (pkg) {
    case 'PKG-BCGO':
    case 'PKG-JOIN':
      // First 2 hrs 150%, then 200%; all after noon = 200%
      if (isAfterNoon) return 2.0
      return overtimeHourIndex < 2 ? 1.5 : 2.0

    case 'PKG-ELEC':
      // Handled as overtime — min 4 hrs; FT/PT Saturday ordinary shift = 150%
      // For overtime: same as weekday OT
      if (casual) return overtimeHourIndex < 2 ? 1.875 : 2.5
      return overtimeHourIndex < 2 ? 1.5 : 2.0

    case 'PKG-PLUMB-MECH':
      if (casual) {
        if (isAfterNoon) return 2.25
        return overtimeHourIndex < 2 ? 1.75 : 2.25
      }
      if (isAfterNoon) return 2.0
      return overtimeHourIndex < 2 ? 1.5 : 2.0

    case 'PKG-PLUMB-SPRINKLER':
      // 200% all time FT/PT; 225% all time casual — no 1.5× first 2hrs
      return casual ? 2.25 : 2.0

    case 'PKG-CRANE':
      // First 2 OT hrs 150%, then 200%; after noon 200%
      if (isAfterNoon) return 2.0
      return overtimeHourIndex < 2 ? 1.5 : 2.0

    case 'PKG-PREMIX':
      if (casual) return overtimeHourIndex < 2 ? 1.75 : 2.25
      return overtimeHourIndex < 2 ? 1.5 : 2.0

    default:
      if (isAfterNoon) return 2.0
      return overtimeHourIndex < 2 ? 1.5 : 2.0
  }
}

// ─── Sunday multiplier ───────────────────────────────────────────────────────

function sundayMultiplier(pkg: PackageCode, employmentType: EmploymentType): number {
  const casual = employmentType === 'casual'
  switch (pkg) {
    case 'PKG-ELEC': return casual ? 2.5 : 2.0
    case 'PKG-PLUMB-MECH':
    case 'PKG-PLUMB-SPRINKLER': return casual ? 2.25 : 2.0
    case 'PKG-PREMIX': return casual ? 2.25 : 2.0
    default: return 2.0
  }
}

// ─── Public holiday multiplier ───────────────────────────────────────────────

function publicHolidayMultiplier(pkg: PackageCode, employmentType: EmploymentType): number {
  const casual = employmentType === 'casual'
  switch (pkg) {
    case 'PKG-ELEC': return casual ? 3.125 : 2.5
    case 'PKG-PLUMB-MECH':
    case 'PKG-PLUMB-SPRINKLER': return casual ? 2.75 : 2.5
    case 'PKG-PREMIX': return casual ? 2.75 : 2.5
    default: return 2.5
  }
}

// ─── Main calculator ─────────────────────────────────────────────────────────

export function calculatePay(input: PayCalcInput): PayCalcResult {
  const {
    packageCode,
    employmentType,
    baseHourlyRate,
    dayOfWeek,
    isPublicHoliday,
    hoursWorked,
    standardDailyHours,
    startHour = 7,
  } = input

  const minEngagement = getMinimumEngagement(packageCode, dayOfWeek, isPublicHoliday)
  const effectiveHours = Math.max(hoursWorked, minEngagement)
  const lines: string[] = []

  // ── Public holiday ──
  if (isPublicHoliday) {
    const mult = publicHolidayMultiplier(packageCode, employmentType)
    const pay = effectiveHours * baseHourlyRate * mult
    if (minEngagement > hoursWorked) {
      lines.push(`Minimum engagement applied: ${minEngagement}hrs`)
    }
    lines.push(`${effectiveHours}hrs × $${baseHourlyRate.toFixed(2)} × ${mult}× (public holiday) = $${pay.toFixed(2)}`)
    return {
      ordinaryHours: 0,
      ordinaryPay: 0,
      overtimeHours: effectiveHours,
      overtimePay: pay,
      totalPay: pay,
      breakdown: lines.join('\n'),
    }
  }

  // ── Sunday ──
  if (dayOfWeek === 'sunday') {
    const mult = sundayMultiplier(packageCode, employmentType)
    const pay = effectiveHours * baseHourlyRate * mult
    if (minEngagement > hoursWorked) {
      lines.push(`Minimum engagement applied: ${minEngagement}hrs`)
    }
    lines.push(`${effectiveHours}hrs × $${baseHourlyRate.toFixed(2)} × ${mult}× (Sunday) = $${pay.toFixed(2)}`)
    return {
      ordinaryHours: 0,
      ordinaryPay: 0,
      overtimeHours: effectiveHours,
      overtimePay: pay,
      totalPay: pay,
      breakdown: lines.join('\n'),
    }
  }

  // ── Saturday ──
  if (dayOfWeek === 'saturday') {
    if (minEngagement > hoursWorked) {
      lines.push(`Minimum engagement applied: ${minEngagement}hrs`)
    }
    let totalPay = 0
    const noonHour = 12
    const hoursBeforeNoon = Math.max(0, Math.min(effectiveHours, noonHour - startHour))
    const hoursAfterNoon = Math.max(0, effectiveHours - hoursBeforeNoon)

    // Hours before noon
    for (let i = 0; i < hoursBeforeNoon; i++) {
      const mult = saturdayMultiplier(packageCode, employmentType, i, false)
      totalPay += baseHourlyRate * mult
    }
    // Hours after noon
    for (let i = 0; i < hoursAfterNoon; i++) {
      const mult = saturdayMultiplier(packageCode, employmentType, hoursBeforeNoon + i, true)
      totalPay += baseHourlyRate * mult
    }

    lines.push(`${effectiveHours}hrs Saturday (start ${startHour}:00) = $${totalPay.toFixed(2)}`)
    return {
      ordinaryHours: 0,
      ordinaryPay: 0,
      overtimeHours: effectiveHours,
      overtimePay: totalPay,
      totalPay,
      breakdown: lines.join('\n'),
    }
  }

  // ── Monday–Friday ──
  const ordinaryHours = Math.min(hoursWorked, standardDailyHours)
  const overtimeHours = Math.max(0, hoursWorked - standardDailyHours)
  const ordinaryPay = ordinaryHours * baseHourlyRate

  let overtimePay = 0
  for (let i = 0; i < overtimeHours; i++) {
    const mult = weekdayOvertimeMultiplier(packageCode, employmentType, i)
    overtimePay += baseHourlyRate * mult
  }

  const totalPay = ordinaryPay + overtimePay
  lines.push(`${ordinaryHours}hrs ordinary × $${baseHourlyRate.toFixed(2)} = $${ordinaryPay.toFixed(2)}`)
  if (overtimeHours > 0) {
    lines.push(`${overtimeHours}hrs overtime = $${overtimePay.toFixed(2)}`)
  }
  lines.push(`Total: $${totalPay.toFixed(2)}`)

  return { ordinaryHours, ordinaryPay, overtimeHours, overtimePay, totalPay, breakdown: lines.join('\n') }
}

// ─── Rate preview table (for Pay Rules page) ─────────────────────────────────

export interface RatePreviewRow {
  situation: string
  multiplier: string
  amount: string
}

export function getPreviewRates(
  pkg: PackageCode,
  employmentType: EmploymentType,
  baseRate: number
): RatePreviewRow[] {
  const fmt = (n: number) => `$${(baseRate * n).toFixed(2)}`
  const casual = employmentType === 'casual'

  const rows: RatePreviewRow[] = [
    { situation: 'Ordinary hours', multiplier: '1.0×', amount: fmt(1.0) },
  ]

  // Weekday OT
  const wdOt1 = weekdayOvertimeMultiplier(pkg, employmentType, 0)
  const wdOt2 = weekdayOvertimeMultiplier(pkg, employmentType, 2)
  rows.push({ situation: 'Weekday OT (first 2 hrs)', multiplier: `${wdOt1}×`, amount: fmt(wdOt1) })
  rows.push({ situation: 'Weekday OT (after 2 hrs)', multiplier: `${wdOt2}×`, amount: fmt(wdOt2) })

  // Saturday
  if (pkg === 'PKG-PLUMB-SPRINKLER') {
    const sMult = casual ? 2.25 : 2.0
    rows.push({ situation: 'Saturday (all time)', multiplier: `${sMult}×`, amount: fmt(sMult) })
  } else {
    const sat1 = saturdayMultiplier(pkg, employmentType, 0, false)
    const sat2 = saturdayMultiplier(pkg, employmentType, 2, false)
    const satNoon = saturdayMultiplier(pkg, employmentType, 0, true)
    rows.push({ situation: 'Saturday (first 2 hrs)', multiplier: `${sat1}×`, amount: fmt(sat1) })
    rows.push({ situation: 'Saturday (after 2 hrs)', multiplier: `${sat2}×`, amount: fmt(sat2) })
    if (satNoon !== sat2) {
      rows.push({ situation: 'Saturday (after noon)', multiplier: `${satNoon}×`, amount: fmt(satNoon) })
    }
  }

  // Sunday
  const sun = sundayMultiplier(pkg, employmentType)
  rows.push({ situation: 'Sunday', multiplier: `${sun}×`, amount: fmt(sun) })

  // Public holiday
  const ph = publicHolidayMultiplier(pkg, employmentType)
  rows.push({ situation: 'Public Holiday', multiplier: `${ph}×`, amount: fmt(ph) })

  return rows
}