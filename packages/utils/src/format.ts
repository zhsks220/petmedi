/**
 * 포맷팅 유틸리티 함수
 */

/**
 * 전화번호 포맷팅
 * 01012345678 -> 010-1234-5678
 */
export function formatPhoneNumber(phone: string | null): string {
  if (!phone) return '-';

  const cleaned = phone.replace(/[^0-9]/g, '');

  if (cleaned.length === 11) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7)}`;
  }

  if (cleaned.length === 10) {
    // 02-1234-5678 or 031-123-4567
    if (cleaned.startsWith('02')) {
      return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
    }
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }

  return phone;
}

/**
 * 사업자등록번호 포맷팅
 * 1234567890 -> 123-45-67890
 */
export function formatBusinessNumber(bn: string | null): string {
  if (!bn) return '-';

  const cleaned = bn.replace(/[^0-9]/g, '');

  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 5)}-${cleaned.slice(5)}`;
  }

  return bn;
}

/**
 * 체중 포맷팅
 */
export function formatWeight(weight: number | null): string {
  if (weight === null || weight === undefined) return '-';

  if (weight < 1) {
    return `${(weight * 1000).toFixed(0)}g`;
  }

  return `${weight.toFixed(1)}kg`;
}

/**
 * 체온 포맷팅
 */
export function formatTemperature(temp: number | null): string {
  if (temp === null || temp === undefined) return '-';
  return `${temp.toFixed(1)}°C`;
}

/**
 * 숫자에 천 단위 콤마 추가
 */
export function formatNumber(num: number | null): string {
  if (num === null || num === undefined) return '-';
  return num.toLocaleString('ko-KR');
}

/**
 * 금액 포맷팅 (원화)
 */
export function formatCurrency(amount: number | null): string {
  if (amount === null || amount === undefined) return '-';
  return `${amount.toLocaleString('ko-KR')}원`;
}

/**
 * 파일 크기 포맷팅
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * 이름 마스킹 (홍길동 -> 홍*동)
 */
export function maskName(name: string | null): string {
  if (!name || name.length < 2) return name ?? '-';

  if (name.length === 2) {
    return `${name[0]}*`;
  }

  const first = name[0];
  const last = name[name.length - 1];
  const middle = '*'.repeat(name.length - 2);

  return `${first}${middle}${last}`;
}

/**
 * 전화번호 마스킹
 * 010-1234-5678 -> 010-****-5678
 */
export function maskPhoneNumber(phone: string | null): string {
  if (!phone) return '-';

  const formatted = formatPhoneNumber(phone);
  const parts = formatted.split('-');

  if (parts.length === 3) {
    return `${parts[0]}-****-${parts[2]}`;
  }

  return phone;
}

/**
 * 이메일 마스킹
 * test@example.com -> t***@example.com
 */
export function maskEmail(email: string | null): string {
  if (!email) return '-';

  const [localPart, domain] = email.split('@');
  if (!localPart || !domain) return email;

  const maskedLocal =
    localPart.length > 2
      ? `${localPart[0]}${'*'.repeat(localPart.length - 1)}`
      : `${localPart[0]}*`;

  return `${maskedLocal}@${domain}`;
}

/**
 * 문자열 자르기 (말줄임표 추가)
 */
export function truncate(str: string | null, maxLength: number): string {
  if (!str) return '-';
  if (str.length <= maxLength) return str;
  return `${str.slice(0, maxLength - 3)}...`;
}
