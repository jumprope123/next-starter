'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { useAppTranslation } from '@/i18n/use-app-translation';
import { queries } from '@/providers';
import { useLocalSettingsStore } from '@/stores';

const profileSchema = z.object({
  nickname: z.string().min(2, '닉네임은 2자 이상 입력해주세요.'),
});

type ProfileSchema = z.infer<typeof profileSchema>;

/**
 * Zustand / React Query / react-hook-form + zod / react-hot-toast 가 모두 동작하는지
 * 한 번에 확인할 수 있는 데모 컴포넌트.
 *
 * 새 프로젝트로 옮기면 이 컴포넌트는 통째로 삭제하면 된다 — 의존성 / Provider 동작 검증용 샘플.
 */
export function TemplatePlayground() {
  const t = useAppTranslation();
  const { isDarkMode, setIsDarkMode } = useLocalSettingsStore();
  const pingQuery = useQuery(queries.commons.ping());

  const { register, handleSubmit, formState } = useForm<ProfileSchema>({
    resolver: zodResolver(profileSchema),
    defaultValues: { nickname: '' },
  });

  const onSubmit = (values: ProfileSchema) => {
    toast.success(`저장됨: ${values.nickname}`);
  };

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold">
        {t('0004', { fallback: 'State / Data / Form Playground' })}
      </h2>

      <div className="mt-3 flex items-center gap-3">
        <button
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
          onClick={() => setIsDarkMode(!isDarkMode)}
          type="button"
        >
          Zustand: {isDarkMode ? 'ON' : 'OFF'}
        </button>
      </div>

      <div className="mt-3 text-sm text-zinc-700">
        React Query ping: {pingQuery.data?.now ?? 'loading...'}
      </div>

      <form className="mt-4 flex items-center gap-2" onSubmit={handleSubmit(onSubmit)}>
        <input
          {...register('nickname')}
          className="min-w-60 rounded-md border border-zinc-300 px-3 py-2 text-sm"
          placeholder="react-hook-form + zod"
        />
        <button className="rounded-md bg-blue-600 px-3 py-2 text-sm text-white" type="submit">
          저장
        </button>
      </form>

      {formState.errors.nickname?.message ? (
        <p className="mt-2 text-sm text-red-600">{formState.errors.nickname.message}</p>
      ) : null}
    </section>
  );
}
