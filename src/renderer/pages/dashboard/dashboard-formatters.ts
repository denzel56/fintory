export const formatMoney = (amountMinor: number, currency: string): string => {
  const amount = amountMinor / 100

  try {
    return new Intl.NumberFormat(undefined, {
      currency,
      style: 'currency',
    }).format(amount)
  } catch {
    return `${amount.toFixed(2)} ${currency}`
  }
}

export const formatSignedMoney = (amountMinor: number, currency: string): string => {
  const sign = amountMinor > 0 ? '+' : ''

  return `${sign}${formatMoney(amountMinor, currency)}`
}

export const formatMonth = (month: string): string => {
  const date = new Date(`${month}-01T00:00:00`)

  if (Number.isNaN(date.getTime())) {
    return month
  }

  return new Intl.DateTimeFormat(undefined, { month: 'short', year: 'numeric' }).format(date)
}

export const formatTransactionDate = (value: string): string => {
  const date = new Date(`${value}T00:00:00`)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleDateString()
}

export type DashboardPeriodQuery = {
  readonly fromDate: string | null
  readonly toDate: string | null
}

export const getPeriodLabel = (query: DashboardPeriodQuery): string => {
  if (query.fromDate && query.toDate) {
    return `${query.fromDate} to ${query.toDate}`
  }

  if (query.fromDate) {
    return `From ${query.fromDate}`
  }

  if (query.toDate) {
    return `Until ${query.toDate}`
  }

  return 'All imported transactions'
}
