
export const useIpfsLink = (hash: string) => {
  const { public: { ipfsGatewayUrl } } = useRuntimeConfig()
  return `${ipfsGatewayUrl}/${hash}`
};
