export function formatMoney(amount: number) {
  return `${Math.round(amount).toLocaleString()} so'm`;
}

function formatIntegerPart(value: string) {
  const normalizedValue = value.replace(/^0+(?=\d)/, '') || '0';

  return Number(normalizedValue).toLocaleString();
}

export type DeliveryPaymentStatus = 'unpaid' | 'partially_paid' | 'paid';

export function getStatusBadgeVariant(status: string) {
  if (status === 'paid') return 'success';
  if (status === 'partially_paid') return 'warning';
  return 'danger';
}

export function getStatusLabel(status: string) {
  if (status === 'paid') return "To'langan";
  if (status === 'partially_paid') return 'Qisman';
  return "To'lanmagan";
}

export function getPaymentStatus(
  totalAmount: number,
  paidAmount: number | null | undefined
): DeliveryPaymentStatus {
  const safeTotalAmount = Number.isFinite(totalAmount) ? totalAmount : 0;
  const safePaidAmount = Number.isFinite(paidAmount ?? 0) ? (paidAmount ?? 0) : 0;

  if (safePaidAmount >= safeTotalAmount) return 'paid';
  if (safePaidAmount > 0) return 'partially_paid';
  return 'unpaid';
}

export function getRemainingBalance(totalAmount: number, paidAmount: number | null | undefined) {
  const safeTotalAmount = Number.isFinite(totalAmount) ? totalAmount : 0;
  const safePaidAmount = Number.isFinite(paidAmount ?? 0) ? (paidAmount ?? 0) : 0;

  return Math.max(0, safeTotalAmount - safePaidAmount);
}

export function normalizePaymentAmountInput(value: string) {
  return value.replace(/[^\d]/g, '');
}

export function normalizeIntegerInput(value: string) {
  return normalizePaymentAmountInput(value);
}

export function formatIntegerInput(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  if (typeof value === 'number') {
    return Math.max(0, Math.trunc(value)).toLocaleString();
  }

  const normalizedValue = normalizeIntegerInput(value);

  if (!normalizedValue) {
    return '';
  }

  return formatIntegerPart(normalizedValue);
}

export function normalizeDecimalInput(value: string) {
  const rawValue = value.replace(/,/g, '').replace(/[^\d.]/g, '');
  const hasTrailingDecimal = rawValue.endsWith('.');
  const [integerPart = '', ...fractionParts] = rawValue.split('.');
  const normalizedIntegerPart = integerPart.replace(/^0+(?=\d)/, '');
  const safeIntegerPart = normalizedIntegerPart || (integerPart ? '0' : '');

  if (fractionParts.length === 0) {
    if (!safeIntegerPart && rawValue.startsWith('.')) {
      return hasTrailingDecimal ? '0.' : '0';
    }

    return hasTrailingDecimal ? `${safeIntegerPart || '0'}.` : safeIntegerPart;
  }

  const fractionPart = fractionParts.join('');

  return `${safeIntegerPart || '0'}.${fractionPart}`;
}

export function formatDecimalInput(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  const normalizedValue =
    typeof value === 'number' ? String(Math.max(0, value)) : normalizeDecimalInput(value);

  if (!normalizedValue) {
    return '';
  }

  const hasTrailingDecimal = normalizedValue.endsWith('.');
  const [integerPart = '0', fractionPart = ''] = normalizedValue.split('.');
  const formattedIntegerPart = formatIntegerPart(integerPart);

  if (hasTrailingDecimal) {
    return `${formattedIntegerPart}.`;
  }

  if (normalizedValue.includes('.')) {
    return `${formattedIntegerPart}.${fractionPart}`;
  }

  return formattedIntegerPart;
}

export function parseIntegerInput(value: string) {
  const normalizedValue = normalizeIntegerInput(value);

  if (!normalizedValue) {
    return 0;
  }

  return Number(normalizedValue);
}

export function parseDecimalInput(value: string) {
  const normalizedValue = normalizeDecimalInput(value);
  const parsedValue = Number.parseFloat(normalizedValue);

  if (!Number.isFinite(parsedValue)) {
    return 0;
  }

  return parsedValue;
}

export function capPaymentAmount(amount: number, remainingBalance: number) {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const safeRemainingBalance = Number.isFinite(remainingBalance) ? remainingBalance : 0;

  return Math.min(Math.max(safeAmount, 0), Math.max(safeRemainingBalance, 0));
}

export function getDeliveryRouteLabel(factoryName?: string | null, clientName?: string | null) {
  const safeFactoryName = factoryName || 'Zavod tanlanmagan';
  const safeClientName = clientName || "Do'kon tanlanmagan";

  return `${safeFactoryName} \u2192 ${safeClientName}`;
}
