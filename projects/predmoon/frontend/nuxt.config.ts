// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from "@tailwindcss/vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";

const modules = [
  "@vant/nuxt",
  "@vue-macros/nuxt",
  "@pinia/nuxt",
  "@nuxtjs/supabase",
  "@nuxtjs/i18n",
  "pinia-plugin-persistedstate/nuxt",
  "@vueuse/motion/nuxt",
  "@vueuse/nuxt",
  "nuxt-meta-pixel",
];

const buildTime = Date.now() - 3600 * 1000 * 12;
const branch = process.env.VERCEL_GIT_COMMIT_REF || "localBranch";
const hash = process.env.VERCEL_GIT_COMMIT_SHA || "localHash";

console.log("branch", branch);
console.log("hash", hash);
console.log("buildTime", buildTime);

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },

  plugins: [],

  modules,
  css: ["~/assets/css/main.css"],

  vite: {
    build: {
      sourcemap: false,
    },
    optimizeDeps: {
      include: [
        "lodash",
        "decimal.js",
        "axios",
        "@wagmi/core",
        "@wagmi/vue",
        "viem",
        "@reown/appkit",
        "@reown/appkit-adapter-wagmi",
        "@privy-io/js-sdk-core",
        "@lighthouse-web3/sdk",
        "@line/liff",
      ],
    },
    server: {
      allowedHosts: [
        "localhost",
        "9f88f6df8068.ngrok-free.app",
        "frp.jdoffices.com",
      ],
    },
    plugins: [
      tailwindcss(),
      nodePolyfills({
        include: ["path"],
        exclude: ["http"],
        globals: {
          Buffer: true,
          global: true,
          process: true,
        },
        overrides: {
          fs: "memfs",
        },
        protocolImports: true,
      }),
    ],
    define: {
      "import.meta.env.NUXT_PUBLIC_API_PREFIX": JSON.stringify(
        process.env.NUXT_PUBLIC_API_PREFIX
      ),
      "import.meta.env.NUXT_PUBLIC_PRIVY_CLIENT_ID": JSON.stringify(
        process.env.NUXT_PUBLIC_PRIVY_CLIENT_ID
      ),
      "import.meta.env.NUXT_PUBLIC_BRANCH": JSON.stringify(branch),
      "import.meta.env.NUXT_PUBLIC_HASH": JSON.stringify(hash),
      "import.meta.env.NUXT_PUBLIC_LOG_ROCKET_ID": JSON.stringify(
        process.env.NUXT_PUBLIC_LOG_ROCKET_ID || ""
      ),
      "import.meta.env.NUXT_PUBLIC_TG_BOT_INFO": JSON.stringify(
        process.env.NUXT_PUBLIC_TG_BOT_INFO || ""
      ),
      "import.meta.env.NUXT_LIGHTHOUSE_STORAGE_API_KEY": JSON.stringify(
        process.env.NUXT_LIGHTHOUSE_STORAGE_API_KEY || ""
      ),
      "import.meta.env.NUXT_PUBLIC_IPFS_GATEWAY_URL": JSON.stringify(
        process.env.NUXT_PUBLIC_IPFS_GATEWAY_URL || ""
      ),
    },
  },

  i18n: {
    defaultLocale: "en-US",
    locales: [
      { code: "en-US", language: "English", file: "en-US.json" },
      { code: "zh-TW", language: "繁體中文", file: "zh-TW.json" },
      { code: "ja-JP", language: "日本語", file: "ja-JP.json" },
      { code: "ko-KR", language: "한국어", file: "ko-KR.json" },
    ],
  },

  build: {
    transpile: ["form-data"],
  },

  piniaPluginPersistedstate: {
    key: "v1_0_0_%id",
  },

  supabase: {
    redirect: false,
    redirectOptions: {
      login: "/login",
      callback: "/confirm",
      exclude: ["/"],
    },
    clientOptions: {
      auth: {
        flowType: "pkce",
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
      },
    },
  },

  runtimeConfig: {
    lighthouseStorageApiKey: process.env.NUXT_LIGHTHOUSE_STORAGE_API_KEY,
    public: {
      buildTime,
      branch,
      hash,
      ipfsGatewayUrl: process.env.NUXT_PUBLIC_IPFS_GATEWAY_URL,
      tgBotInfo: process.env.NUXT_PUBLIC_TG_BOT_INFO,
      reownProjectId: process.env.NUXT_PUBLIC_REOWN_PROJECT_ID,
      apiPrefix: process.env.NUXT_PUBLIC_API_PREFIX || "http://192.168.1.82:48082",
      isTestnet: process.env.NUXT_PUBLIC_IS_TESTNET === "true",
      siteUrl: "",
      siteName: process.env.NUXT_PUBLIC_SITE_NAME || "Puzzle Lite",
      siteSlogan: process.env.NUXT_PUBLIC_SITE_SLOGAN || "Predict. Trade. Prosper: The Collective Intelligence DEX.",
      siteDescription: process.env.NUXT_PUBLIC_SITE_DESCRIPTION || "The Puzzle is an exchange protocol that facilitates atomic swaps between 'Conditional ERC1155 NFT Token' assets and an ERC20 collateral asset.",
      privy: {
        appId: process.env.NUXT_PUBLIC_PRIVY_APP_ID || "",
        clientId: process.env.NUXT_PUBLIC_PRIVY_CLIENT_ID || "",
      },
      kaia: {
        enabled: process.env.NUXT_PUBLIC_ENABLE_KAIA === "true",
        clientId: process.env.NUXT_PUBLIC_KAIA_CLIENT_ID || "",
        clientSecret: process.env.NUXT_PUBLIC_KAIA_CLIENT_SECRET || "",
        chainId: process.env.NUXT_PUBLIC_KAIA_CHAIN_ID || "1001",
        liffId: process.env.NUXT_PUBLIC_LIFF_ID || "",
        endpointUrl: process.env.NUXT_PUBLIC_ENDPOINT_URL || "",
      },
      logRocket: {
        id: process.env.NUXT_PUBLIC_LOG_ROCKET_ID || "",
        dev: false,
        enablePinia: true,
        config: {},
      },
      metapixel: {
        default: { id: "663557993469179" },
      },
      aws: {
        region: process.env.NUXT_PUBLIC_AWS_REGION || "",
        bucketPub: process.env.NUXT_PUBLIC_AWS_BUCKET_PUB || ""
      }
    },
  },
  gtag: {
    enabled: process.env.NODE_ENV === 'production',
  }
});
