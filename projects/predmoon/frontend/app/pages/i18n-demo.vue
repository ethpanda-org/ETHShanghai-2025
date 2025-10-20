<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <div class="h-full">
    <LangSwitcherLabel />
    <div>
      Nuxt I18n:
      <a :title="$t('i18n docs')" target="_blank" href="https://i18n.nuxtjs.org/docs/getting-started/usage">
        {{ $t('i18n docs') }}
      </a>
      <br />
    </div>
    <div>
      <p>全局字符串：{{ $t('Hello') }}</p>
      <ol>
        <li>
          1. 添加新的字符串到对应的 json里面： i18n/locales/xxxx.json
        </li>
        <li>
          2. 在模板中使用 $t('Hello') 即可
        </li>
      </ol>
      <br />
      <br />
      <br />
      <p>本地字符串（只有在某个 template 里面才生效）<br />
        <br />
        {{ t('Hello Local') }}
        <br />
        <br />
      </p>
      <ol>
        <li>
          1. 添加新的字符串到本地 template 的 json 里面（参考本文件代码结尾的 i18n 的 tag）
        </li>
        <li>
          2. 在模板中使用 t('Hello Local')
        </li>
        <li>
          3. 要在 script setup 里面导入 const { t } = useI18n()
        </li>
      </ol>
    </div>
  </div>
</template>
<i18n lang="json">{
  "en-US": {
    "Hello Local": "Hello Local"
  },
  "zh-TW": {
    "Hello Local": "汝好 Local"
  },
  "ja-JP": {
    "Hello Local": "こんにちは、ローカル!"
  },
  "ko-KR": {
    "Hello Local": "你好 Local"
  }
}</i18n>
