import { useUserStore } from "../stores/userStore";

export default function WalletLogin() {
    const { walletAddress, setWallet } = useUserStore();

    async function connectWallet() {
        if (!(window as any).ethereum) {
            alert("请先安装 MetaMask!");
            return;
        }
        try {
            const accounts = await (window as any).ethereum.request({
                method: "eth_requestAccounts",
            });
            setWallet(accounts[0]);
        } catch (err) {
            console.error(err);
        }
    }

    return (
        <div className="flex justify-center items-center p-4">
            {walletAddress ? (
                <div className="text-green-500 font-bold">
                    已连接: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </div>
            ) : (
                <button
                    onClick={connectWallet}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-xl shadow hover:bg-indigo-700 transition"
                >
                    连接钱包
                </button>
            )}
        </div>
    );
}
