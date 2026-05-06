'use server';

import { cookies } from 'next/headers';
import type { CookieName } from '@/constants';

/**
 * 쿠키 저장 옵션. `setCookieAction` 에 그대로 전달된다.
 *
 * 미지정 시 만료 정책: `maxAge` / `expires` 둘 다 없으면 세션 쿠키 (브라우저 종료 시 삭제).
 */
export type CookieOptions = {
  /** 만료까지 남은 초 (만료 시각 대신 사용). */
  maxAge?: number;
  /** 정확한 만료 시각. `maxAge` 와 함께 쓰지 않는다. */
  expires?: Date;
  /** 쿠키 경로. (기본 `'/'`) */
  path?: string;
  /** 쿠키 도메인. */
  domain?: string;
  /** Secure 플래그. 미지정 시 production 환경에서 자동 `true`. */
  secure?: boolean;
  /** SameSite 플래그. 기본 `'lax'`. */
  sameSite?: 'strict' | 'lax' | 'none';
};

/**
 * 쿠키에 데이터를 저장하는 서버 액션.
 *
 * - 객체 값을 넘기면 자동으로 `JSON.stringify` 한다.
 * - 항상 `httpOnly: true` 로 저장하므로 클라이언트 JS 에서 직접 읽을 수 없다 — 서버 액션을 통해서만 접근.
 * - `secure` 는 production 에서 자동 `true`.
 *
 * @param name `CookieName` enum 값 (오타 방지를 위해 문자열 리터럴 대신 enum 사용)
 * @param value 저장할 값. 객체는 JSON 문자열로 직렬화된다.
 * @param options 쿠키 옵션 (만료 / 경로 / SameSite 등)
 */
export async function setCookieAction({
  name,
  value,
  options,
}: {
  name: CookieName;
  value: string | object;
  options?: CookieOptions;
}) {
  const cookieStore = await cookies();
  const cookieValue = typeof value === 'string' ? value : JSON.stringify(value);

  cookieStore.set(name, cookieValue, {
    httpOnly: true,
    secure: options?.secure ?? process.env.NODE_ENV === 'production',
    sameSite: options?.sameSite ?? 'lax',
    ...(options?.maxAge !== undefined && { maxAge: options.maxAge }),
    ...(options?.expires && { expires: options.expires }),
    ...(options?.path && { path: options.path }),
    ...(options?.domain && { domain: options.domain }),
  });
}

/**
 * 쿠키에서 데이터를 읽어 오는 서버 액션.
 *
 * 값이 JSON 으로 직렬화된 형태였다면 자동으로 파싱해 `T` 로 돌려준다.
 * 파싱에 실패하면 원본 문자열을 그대로 돌려준다.
 *
 * @returns 쿠키가 존재하지 않으면 `null`.
 */
export async function getCookieAction<T = unknown>(name: CookieName): Promise<T | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(name);
  if (!cookie?.value) return null;

  try {
    return JSON.parse(cookie.value) as T;
  } catch {
    return cookie.value as T;
  }
}

/** 쿠키를 삭제한다 (path 가 다른 도메인에 저장한 쿠키는 path 를 직접 옵션으로 명시한다). */
export async function deleteCookieAction(name: CookieName) {
  const cookieStore = await cookies();
  cookieStore.delete(name);
}
