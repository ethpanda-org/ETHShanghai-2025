import { useAuthStore } from "@/store/userStore";
import { formatAddress } from "@/utils/utils";

export default function HashLink({ hash, chainId, className, isShort = true, underline = true }: { hash: string; chainId: number | string; className?: string; isShort?: boolean; underline?: boolean }) {
    const chains = useAuthStore(state => state.chains);
    const chain = chains?.find(c => c.chain_id.toString() === chainId.toString());

    return (
        <a href={`${chain?.block_explorer_urls}/tx/${hash}`} target='_blank' rel='noopener noreferrer' className={className} style={{ textDecoration: underline ? 'underline' : 'none' }}>
            {isShort ? formatAddress(hash) : hash}
        </a>
    );
}