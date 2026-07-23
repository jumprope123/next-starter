import returnFetch, { type FetchArgs } from 'return-fetch';

/**
 * `fetcher` 가 받는 부가 옵션.
 *
 * - `false`(기본): 인증 없이 호출. JWT 등을 자동 첨부하지 않는다.
 * - `'required'`: 인증이 필요한 호출이라는 표식. 실제 토큰 주입은 프로젝트별 인터셉터에서 구현한다.
 */
export type FetcherAuth = false | 'required';

/**
 * `fetchExtended` / `fetcher` 가 4xx / 5xx 응답을 받을 때 던지는 에러 타입.
 *
 * 단순 메시지뿐 아니라 다음 정보를 함께 들고 있어, react-query 의 `error` 핸들러나 토스트 노출
 * 로직에서 분기 처리를 쉽게 할 수 있다.
 *
 * - `status` : HTTP 상태 코드 (예: `401`, `404`, `500`)
 * - `body`   : 응답 원문 텍스트
 * - `data`   : 본문이 JSON 으로 파싱되면 그 결과 (`unknown`), 아니면 `null`
 * - `url`    : 요청 URL
 *
 * @example
 *   try {
 *     await fetcher('/users/me', { auth: 'required' });
 *   } catch (e) {
 *     if (e instanceof ApiError && e.status === 401) router.replace('/login');
 *   }
 */
export class ApiError extends Error {
  readonly status: number;
  readonly body: string;
  readonly data: unknown;
  readonly url: string;

  constructor({
    status,
    body,
    data,
    url,
    message,
  }: {
    status: number;
    body: string;
    data: unknown;
    url: string;
    message?: string;
  }) {
    super(message ?? body ?? `API request failed (${status})`);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
    this.data = data;
    this.url = url;
  }
}

/**
 * 프로젝트 전역에서 사용하는 확장 fetch.
 *
 * `return-fetch` 의 인스턴스로, 다음 동작이 추가되어 있다.
 * - 기본 `Accept: application/json` 헤더.
 * - 응답 인터셉터에서 4xx / 5xx 응답은 본문을 읽어 `ApiError` 로 던진다.
 *   본문이 JSON 이면 자동 파싱되어 `error.data` 로 접근할 수 있다.
 *
 * `baseUrl` 은 비워 두었으므로 호출 시 절대/상대 경로를 직접 지정한다. 환경별 baseUrl 이
 * 필요하면 인터셉터를 확장하거나 `next.config.ts` 의 rewrites (`/proxy/*`) 를 활용한다.
 */
export const fetchExtended = returnFetch({
  baseUrl: '',
  headers: { Accept: 'application/json' },
  interceptors: {
    request: async (args) => args,
    response: async (response, requestArgs) => {
      if (response.status >= 400) {
        const body = await response.clone().text();
        let data: unknown = null;
        try {
          data = JSON.parse(body);
        } catch {
          /* 본문이 JSON 이 아니면 data 는 null */
        }
        const url = requestArgs?.[0]?.toString?.() ?? '';
        throw new ApiError({ status: response.status, body, data, url });
      }
      return response;
    },
  },
});

/**
 * `fetchExtended` 를 한 번 더 감싸 다음을 표준화한 헬퍼.
 *
 * - `/api/...` 와 `/proxy/...` 로 시작하지 않는 경로는 `next.config.ts` 의 `/proxy/app/*` rewrite 로 보낸다.
 * - 응답을 한 번 `clone()` 한 뒤 JSON 으로 파싱해 `data` 와 원본 `response` 를 함께 반환한다.
 *   호출 측이 헤더/스테이터스가 더 필요하면 `response` 를, 본문만 쓰고 싶으면 `data` 를 사용한다.
 *
 * 인증이 필요한 호출은 `init.auth: 'required'` 로 표식만 남기고, 실제 토큰 주입은
 * 프로젝트별 인터셉터(혹은 NextAuth 어댑터) 에서 처리한다.
 *
 * @example
 * const { data } = await fetcher<PingResponse>('/api/ping');
 * const { data } = await fetcher<UserDto>('/users/me', { auth: 'required' });
 */
export const fetcher = async <T>(url: URL | RequestInfo, init?: (RequestInit & { auth?: FetcherAuth }) | undefined) => {
  const { auth = false, ...options } = { ...init };
  const requestUrl = getRequestUrl({ url, auth });
  const headers = new Headers(options.headers ?? undefined);
  if (!headers.has('Accept')) headers.set('Accept', 'application/json');

  const response = await fetchExtended(requestUrl, { ...options, headers } as FetchArgs[1]);
  // 204 No Content 처럼 본문이 없거나 JSON 이 아닌 성공 응답에서는 파싱 에러 대신 null 을 돌려준다.
  const data = (await response
    .clone()
    .json()
    .catch(() => null)) as T;

  return { response, data };
};

const getRequestUrl = ({ url }: { url: URL | RequestInfo; auth: FetcherAuth }) => {
  const path = url.toString();
  if (path.startsWith('/api')) return path;
  if (path.startsWith('/proxy/')) return path;
  return `/proxy/app${path.startsWith('/') ? path : `/${path}`}`;
};

/**
 * 평탄한 객체를 `multipart/form-data` 용 `FormData` 로 변환한다.
 *
 * - `File` / `Blob` 값은 그대로 추가한다.
 * - 나머지 원시 타입(`string`, `number`, `boolean`)은 `toString()` 결과로 변환되어 추가된다.
 * - `data` 가 `undefined` 면 빈 `FormData` 를 반환한다.
 *
 * 중첩 객체나 배열은 직접 처리하지 않으므로, 필요할 경우 호출 측에서 미리 평탄화해야 한다.
 *
 * @example
 * await fetchExtended('/api/upload', { method: 'POST', body: createFormData({ name, file }) });
 */
export const createFormData = (data?: Record<string, string | number | boolean | Blob | File>) => {
  const form = new FormData();

  if (data) {
    Object.entries(data).forEach(([key, value]) => {
      const isBinaryData = value instanceof File || value instanceof Blob;
      form.append(key, isBinaryData ? value : value.toString());
    });
  }

  return form;
};
