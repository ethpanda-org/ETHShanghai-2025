import { useAuthStore } from "@/store/userStore";
import Image from "next/image";
import { Network } from "lucide-react";
import TableTag from "../tableContent/TableTag";

export default function ChainLabel({ chainId }: { chainId: number|string }) {
    const chains = useAuthStore(state => state.chains);

    const chain = chains?.find(c => c.chain_id.toString() === chainId.toString());
    const chainLogo = chain?.logo_url;
    const chainName = chain?.display_name;

    const ChainLogo = chainLogo ? <Image
        src={chainLogo}
        alt={chainName || ''}
        width={16}
        height={16}
        className='rounded-full overflow-hidden'
        onError={e => {
            console.error('Failed to load chain logo:', chainLogo);
            e.currentTarget.style.display = 'none';
        }}
    /> : <Network className='h-4 w-4  ' />;

    return <TableTag label={chainName} colorType='default' Icon={ChainLogo} />
}