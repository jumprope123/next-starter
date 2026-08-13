/**
 * 프로젝트에서 사용하는 모든 쿠키 이름을 한 곳에 모은다.
 *
 * - 컴포넌트 / 액션이 직접 문자열 리터럴을 쓰는 대신 이 enum 을 참조하면, 이름 충돌이나 오타를
 *   컴파일 타임에 잡을 수 있다.
 * - 새 보일러플레이트에서는 `THEME` 만 예시로 두었으니 프로젝트에 맞춰 추가한다.
 */
export enum CookieName {
  /** 다크모드 등 사용자 테마 환경 설정 (예시). */
  THEME = 'app-theme',
  /**
   * 웹뷰 safe-area 게이트 플래그. 미들웨어(proxy.ts)가 `?safearea` 파라미터를 이 쿠키로 전환하고,
   * layout 이 읽어 `<html>` 에 `.app-safe-area` 클래스를 SSR 주입한다 (styles/safe-area.css 참조).
   */
  SAFE_AREA = 'app-safe-area',
}
