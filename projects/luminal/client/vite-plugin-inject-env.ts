// Vite 插件：将环境变量注入到 HTML meta 标签中
export function injectEnvToHtml() {
  return {
    name: 'inject-env-to-html',
    transformIndexHtml(html: string) {
      const commitment = process.env.VITE_INITIAL_COMMITMENT || '';
      const vaultAddress = process.env.VITE_VAULT_CONTRACT_ADDRESS || '';
      const wethAddress = process.env.VITE_WETH_ADDRESS || '';
      const usdcAddress = process.env.VITE_USDC_ADDRESS || '';
      const rpcUrl = process.env.VITE_PUBLIC_RPC_URL || '';

      const metaTags = `
    <meta name="initial-commitment" content="${commitment}" />
    <meta name="vault-address" content="${vaultAddress}" />
    <meta name="weth-address" content="${wethAddress}" />
    <meta name="usdc-address" content="${usdcAddress}" />
    <meta name="rpc-url" content="${rpcUrl}" />`;

      return html.replace('</head>', `${metaTags}\n  </head>`);
    }
  };
}
