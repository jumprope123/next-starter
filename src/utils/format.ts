import { format } from 'date-fns';

/**
 * 문자열로 들어오는 숫자 응답을 안전하게 number 로 변환한다.
 *
 * 백엔드가 숫자도 문자열로 직렬화해 보내는 경우(`"123"`)와, 빈 값/`NaN` 을 모두
 * `0` 으로 정규화한다. "값이 없으면 0 으로 본다" 정책에 동의하지 않으면 직접 `Number(...)` 로 처리한다.
 */
export const toNumber = (value?: string | number | null): number => {
  const numberValue = Number(value);
  return Number.isNaN(numberValue) ? 0 : numberValue;
};

/**
 * 숫자(또는 문자열로 직렬화된 숫자)를 한국식 천 단위 콤마 문자열로 변환한다.
 *
 * `Intl.NumberFormat('ko-KR')` 의 옵션을 그대로 받을 수 있어, 통화 / 소수점 / 단위 표기 등을
 * 호출 측에서 조절할 수 있다.
 *
 * @example formatNumber(1234567); // '1,234,567'
 * @example formatNumber(0.7, { style: 'percent' }); // '70%'
 */
export const formatNumber = (amount?: string | number | null, options?: Intl.NumberFormatOptions): string => {
  const numberAmount = toNumber(amount);
  return numberAmount.toLocaleString('ko-KR', options);
};

/**
 * 값과 단위를 로케일 관습에 맞게 결합한다.
 *
 * - 한자(漢字)/한글 단위(원, 장, 명 …)는 한국어 관습대로 공백 없이 붙인다.
 * - 그 외 단위(`%`, `kg`, `EA` …)는 영문 관습대로 한 칸 공백을 둔다.
 *
 * @example joinValueUnit(1000, '원'); // '1000원'
 * @example joinValueUnit(50, '%');    // '50 %'
 */
export const joinValueUnit = (value: string | number, unit: string): string => {
  if (!unit) return String(value);
  const isCJKUnit = /^[　-〿㐀-䶿一-鿿가-힯豈-﫿]/.test(unit);
  return isCJKUnit ? `${value}${unit}` : `${value} ${unit}`;
};

/** 임의 입력에서 숫자 0–9 만 남긴 문자열을 반환한다. (`null`/`undefined` 는 빈 문자열) */
export const remainOnlyNumberFromString = (value?: string | number | null): string => {
  const normalizedValue = value == null ? '' : String(value);
  return normalizedValue.replace(/[^0-9]/g, '');
};

/**
 * 숫자만 들어온 문자열에 한국 전화번호 하이픈 규칙을 적용한다 (내부 헬퍼).
 *
 * 지원 형식
 * - 8 자리 1588/1600/1800 대표번호 → `XXXX-XXXX`
 * - 9 자리 서울 02 지역 → `02-XXX-XXXX`
 * - 10 자리 서울 02 지역 → `02-XXXX-XXXX`
 * - 10 자리 일반(011/031/070 …) → `0XX-XXX-XXXX`
 * - 11 자리(010, 070, 지역 4 자리 가입자) → `0XX-XXXX-XXXX`
 *
 * 매칭되지 않는 길이는 입력 그대로 돌려준다.
 */
const applyKoreanHyphens = (digits: string): string => {
  const len = digits.length;

  if (len === 8 && /^1[5-9]/.test(digits)) {
    return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  }

  if (digits.startsWith('02')) {
    if (len === 9) return `02-${digits.slice(2, 5)}-${digits.slice(5)}`;
    if (len === 10) return `02-${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  if (len === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  if (len === 11) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;

  return digits;
};

/**
 * 전화번호를 하이픈 형식(`010-1234-5678`)으로 정규화한다.
 *
 * 입력에 하이픈이 섞여 있어도, 숫자만 들어와도 동일하게 동작한다.
 * 매칭되지 않는 길이는 가공 없이 원문을 돌려준다.
 */
export const formatPhoneNumber = (phoneNumber?: string | number | null): string => {
  const digits = remainOnlyNumberFromString(phoneNumber);
  if (!digits) return phoneNumber == null ? '' : String(phoneNumber);
  return applyKoreanHyphens(digits);
};

export type PhoneNumberFormatType = 'plain' | 'hyphen';

/**
 * 전화번호 문자열을 지정한 형식(plain / hyphen) 으로 변환한다.
 *
 * - `'plain'` → 숫자만 (`+`, `-` 제거): `01032188447`
 * - `'hyphen'` → 한국 전화번호 하이픈 적용: `010-3218-8447`
 * - 한국 국제번호(`+82...`) 는 앞 0 을 복원해 한국 포맷으로 변환한다.
 * - 그 외 국가코드 국제번호는 `+` 를 유지하고 숫자만 그대로 돌려준다 (국가별 포맷 미지원).
 *
 * `formatType` 을 넘기지 않으면 빈 문자열을 반환한다 — 호출부가 의도를 명시하도록 강제한다.
 */
export const phoneNumberUtil = (phoneNumber?: string | number | null, formatType?: PhoneNumberFormatType): string => {
  if (!phoneNumber) return '';
  if (!formatType) return '';

  const trimmed = String(phoneNumber).trim();
  if (!trimmed) return '';

  const isInternational = trimmed.startsWith('+');
  const digits = remainOnlyNumberFromString(trimmed);
  if (!digits) return '';

  if (formatType === 'plain') return digits;

  if (isInternational) {
    if (digits.startsWith('82')) return applyKoreanHyphens('0' + digits.slice(2));
    return '+' + digits;
  }

  return applyKoreanHyphens(digits);
};

export type DateFormatType = 'dot' | 'dot-time' | 'korean' | 'korean-time';

/**
 * 날짜를 자주 쓰는 한국식 표기로 포맷팅한다.
 *
 * - `'dot'` (기본): `2026.05.06`
 * - `'dot-time'`: `2026.05.06 13:45`
 * - `'korean'`: `2026년 5월 6일`
 * - `'korean-time'`: `2026년 5월 6일 13:45`
 *
 * 타임존은 항상 클라이언트 / 서버 프로세스의 로컬 타임존을 사용한다.
 * 다국어/타임존 분기가 필요해지면 `Intl.DateTimeFormat` 으로 마이그레이션한다.
 */
export const formatDate = (date: Date | string | null, formatType: DateFormatType = 'dot'): string => {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (formatType === 'korean') return format(dateObj, 'yyyy년 M월 d일');
  if (formatType === 'korean-time') return format(dateObj, 'yyyy년 M월 d일 HH:mm');
  if (formatType === 'dot-time') return format(dateObj, 'yyyy.MM.dd HH:mm');
  return format(dateObj, 'yyyy.MM.dd');
};

/**
 * 오늘부터 대상 날짜까지 남은 일수를 양수 정수로 반환한다.
 *
 * `Math.ceil` 로 올림하므로 같은 날 자정 이후라도 `1` 이상이 나올 수 있다.
 * 음수가 필요하다면 (이미 지난 날짜) 직접 `dateObj.getTime() - today.getTime()` 으로 계산한다.
 */
export const calculateDday = (date: Date | string | null): number => {
  if (!date) return 0;
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const diffTime = Math.abs(dateObj.getTime() - Date.now());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};
