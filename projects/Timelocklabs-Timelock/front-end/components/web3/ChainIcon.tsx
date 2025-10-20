import { useAuthStore } from "@/store/userStore";
import Image from "next/image";
import { Network } from "lucide-react";

export default function ChainIcon({ chainId, width=20, height=20 }: { chainId: number | string; width?: number; height?: number }) {
    const chains = useAuthStore(state => state.chains);

    const chain = chains?.find(c => c.chain_id.toString() === chainId.toString());
    const chainLogo = chain?.logo_url;
    const chainName = chain?.display_name;

    return chainLogo ? <Image
        src={chainLogo}
        alt={chainName || ''}
        width={width}
        height={height}
        className='rounded-full overflow-hidden w-full h-full'
        onError={e => {
            console.error('Failed to load chain logo:', chainLogo);
            e.currentTarget.style.display = 'none';
        }}
    /> : <Network className='h-4 w-4' />;
}