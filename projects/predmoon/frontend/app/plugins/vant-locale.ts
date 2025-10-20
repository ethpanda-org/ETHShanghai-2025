import { Locale } from "vant";
import enUS from "vant/es/locale/lang/en-US";
import zhTW from "vant/es/locale/lang/zh-TW";
import jaJP from "vant/es/locale/lang/ja-JP";
import koKR from "vant/es/locale/lang/ko-KR";

export default defineNuxtPlugin(() => {
  Locale.add({
    "en-US": enUS,
    "zh-TW": zhTW,
    "ja-JP": jaJP,
    "ko-KR": koKR,
  });
});
