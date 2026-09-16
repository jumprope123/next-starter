/**
 * `Promise.allSettled` 의 결과 중 성공한 항목의 `value` 만 추출한다.
 *
 * @param result `Promise.allSettled` 의 반환값
 * @returns 성공한 결과의 값 배열 (입력 순서 보존)
 */
export const getFulfilledResults = <T>(result: PromiseSettledResult<T>[]) =>
  result.filter(({ status }) => status === 'fulfilled').map((v) => (v as PromiseFulfilledResult<T>).value);

/**
 * `Promise.allSettled` 의 결과 중 실패한 항목만 추출한다.
 *
 * 반환값은 `PromiseRejectedResult[]` 이며 각 항목의 `reason` 으로 실패 사유에 접근한다.
 *
 * @param result `Promise.allSettled` 의 반환값
 */
export const getRejectedResults = <T>(result: PromiseSettledResult<T>[]) =>
  result.filter(({ status }) => status === 'rejected').map((v) => v as PromiseRejectedResult);

/**
 * 지정한 시간(ms) 동안 대기하는 비동기 헬퍼.
 *
 * `setTimeout` 을 Promise 로 감싼 단순 슬립이며, 테스트 코드나 디바운스 시뮬레이션 등에
 * 사용한다.
 *
 * @param delay 대기할 밀리초
 * @example
 * await sleep(300); // 300ms 대기 후 다음 줄 실행
 */
export const sleep = (delay: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, delay);
  });

/**
 * Promise 에 타임아웃을 부여한다.
 *
 * 정해진 `ms` 안에 resolve / reject 가 없으면 타임아웃 에러로 거부된다.
 * 호출 측은 try/catch 또는 react-query 의 에러 경로에서 동일하게 처리하면 된다.
 *
 * @example
 * const data = await withTimeout(fetchData(), 3000, 'fetchData timed out');
 */
export const withTimeout = <T>(
  promise: Promise<T>,
  ms: number,
  errorMessage: string = `Promise timed out after ${ms}ms`
): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  // 타이머를 반드시 해제한다 — 정리하지 않으면 promise 가 먼저 끝나도 `ms` 동안 콜백과
  // 그 클로저가 살아남아, 타임아웃이 긴 호출을 반복할수록 대기 중인 타이머가 쌓인다.
  return Promise.race<T>([
    promise,
    new Promise<T>((_, reject) => {
      timer = setTimeout(() => reject(new Error(errorMessage)), ms);
    }),
  ]).finally(() => {
    if (timer !== undefined) clearTimeout(timer);
  });
};

/**
 * 실패 시 점진적으로 재시도(backoff)하는 헬퍼.
 *
 * - 기본은 3 회 시도, 시도 간격은 `baseDelay * attempt` 로 선형 증가.
 * - `shouldRetry` 가 `false` 를 반환하면 더 이상 재시도하지 않는다 (예: 4xx 응답 등).
 * - 마지막 시도까지 실패하면 마지막 에러를 그대로 throw 한다.
 *
 * @example
 * await retry(() => fetcher('/api/x'), { retries: 5, baseDelay: 200 });
 */
export const retry = async <T>(
  fn: () => Promise<T>,
  options?: {
    retries?: number;
    baseDelay?: number;
    shouldRetry?: (error: unknown, attempt: number) => boolean;
  }
): Promise<T> => {
  const { retries = 3, baseDelay = 300, shouldRetry } = { ...options };
  let lastError: unknown;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === retries) break;
      if (shouldRetry && !shouldRetry(error, attempt)) break;
      await sleep(baseDelay * attempt);
    }
  }

  throw lastError;
};
