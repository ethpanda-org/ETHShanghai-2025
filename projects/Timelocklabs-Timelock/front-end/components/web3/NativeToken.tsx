import { useAuthStore } from "@/store/userStore";

export default function NativeToken({ chainId }: { chainId: number }) {
    const chains = useAuthStore(state => state.chains);

    const chain = chains?.find(c => c.chain_id === chainId);
    const chainNativeToken = chain?.native_currency_symbol;

    return (
        <span className='font-medium'>{chainNativeToken}</span>
    );
}