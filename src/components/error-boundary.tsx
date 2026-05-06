'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
  /** 에러 발생 시 보여 줄 폴백 노드 또는 함수. */
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  /** 에러 + componentStack 을 외부 모니터링(Sentry 등) 에 보낼 때 사용. */
  onError?: (error: Error, info: ErrorInfo) => void;
};

type State = { error: Error | null };

/**
 * 위젯 단위 에러 폴백을 그려주는 React 클래스 ErrorBoundary.
 *
 * Next.js App Router 의 `error.tsx` / `global-error.tsx` 는 라우트(=세그먼트) 단위 폴백이라,
 * 페이지 전체가 폴백으로 교체된다. 그보다 더 좁은 범위 — 예: 사이드바, 카드, 위젯 — 의 에러를
 * 격리하고 싶을 때 이 컴포넌트로 감싸 사용한다.
 *
 * `fallback` 에 함수를 넘기면 `(error, reset)` 시그니처로 호출되어, 사용자에게 "다시 시도" 버튼을
 * 그릴 수 있다.
 *
 * @example
 * <ErrorBoundary fallback={(e, reset) => <FailCard onRetry={reset} message={e.message} />}>
 *   <Widget />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    this.props.onError?.(error, info);
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    const { error } = this.state;
    const { fallback, children } = this.props;

    if (error) {
      if (typeof fallback === 'function') return fallback(error, this.reset);
      return fallback ?? null;
    }

    return children;
  }
}
