import { Locale } from "vant";
import { useI18n } from "vue-i18n";

export const useSyncVantLocale =() => {
  const { locale } = useI18n();

  onMounted(() => {
    Locale.use(locale.value);
  });

  watch(locale, (val:string) => {
    Locale.use(val);
  });
}
