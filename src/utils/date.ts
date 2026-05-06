import { isDate } from 'date-fns';

/**
 * 초 단위 숫자를 `mm:ss` 형태의 문자열로 변환한다.
 *
 * 초 부분은 한 자리수일 경우 앞에 0을 채워 두 자리로 정렬한다. 분 부분은 0 패딩하지 않으며
 * 60 분이 넘어가도 `60:00`, `120:00` 처럼 누적된다 (시 단위로 분리하지 않음).
 *
 * @param seconds 변환할 총 초 수 (음수 입력은 다루지 않음)
 * @returns `mm:ss` 형식의 문자열
 * @example
 * secondsToMinutes(600); // → '10:00'
 * secondsToMinutes(75);  // → '1:15'
 */
export const secondsToMinutes = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const secondsLeft = seconds % 60;
  return `${minutes}:${secondsLeft < 10 ? `0${secondsLeft}` : secondsLeft}`;
};

/**
 * 시작 시각(ms)부터 종료 시각까지 남은 시간을 일/시/분/초 로 분해한다.
 *
 * 종료 시각이 이미 지났거나 시작과 같으면 모든 단위가 `0` 이 된다 (음수가 되지 않음).
 * 클라이언트 시계와 서버 시계가 다른 경우를 고려하려면 `start` 에 서버에서 받은
 * 기준 시각을 전달하는 것을 권장한다.
 *
 * @param start 기준 시각 (epoch milliseconds)
 * @param end 종료 시각 (`Date` 객체 또는 `Date` 가 파싱할 수 있는 문자열)
 * @returns `{ days, hours, minutes, seconds }` 형태로 분해된 남은 시간
 * @example
 * const { days, hours, minutes, seconds } = getElapsedTime(Date.now(), '2026-12-31');
 */
export const getElapsedTime = (start: number, end: string | Date) => {
  const endDate = isDate(end) ? end : new Date(end);
  const timeDiff = endDate.getTime() - start;
  const totalSeconds = Math.max(Math.floor(timeDiff / 1000), 0);
  const days = Math.max(Math.floor(totalSeconds / (60 * 60 * 24)), 0);
  const hours = Math.max(Math.floor((totalSeconds % (60 * 60 * 24)) / (60 * 60)), 0);
  const minutes = Math.max(Math.floor((totalSeconds % (60 * 60)) / 60), 0);
  const seconds = Math.max(totalSeconds % 60, 0);

  return { days, hours, minutes, seconds };
};
