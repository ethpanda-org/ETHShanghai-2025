'use client';

import { useTranslations } from 'next-intl';
import { setGlobalTranslator } from '@/utils/i18n-helper';

/**
 * This component's sole purpose is to capture the `t` function from `useTranslations`
 * (which is a hook and must be used in a Client Component)
 * and set it in a global module so it can be accessed from non-component files.
 */
export default function I18nInitializer() {
  // The namespace used here does not matter for the function itself.
  // We just need to get a valid `t` function.
  const t = useTranslations('common');
  setGlobalTranslator(t);

  // This component does not render any UI.
  return null;
}
