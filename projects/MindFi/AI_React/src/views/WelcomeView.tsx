import ChatModal from "@/components/ChatModal.tsx";
import {useEffect, useState} from "react";
import {useTranslation} from "react-i18next";
import {useNavigate} from "react-router-dom";
import {Connector, useAccount, useConnect, useSwitchChain} from "wagmi";
import {sepolia} from "wagmi/chains";

const Cover = () => {
    const [open, setOpen] = useState(false);
    const {isConnected} = useAccount();
    const { connectors, connectAsync, status } = useConnect();
    const { switchChainAsync } = useSwitchChain();
    const [selecting, setSelecting] = useState<string | null>(null);
    const { t } = useTranslation();
    const navigate = useNavigate(); // 用于页面跳转

    /** 钱包连接 */
    const handlePick = async (connector: Connector) => {
        const key = (connector as any).uid ?? connector.id;
        try {
            setSelecting(key);
            const res = await connectAsync({ connector });
            if (res.chainId !== sepolia.id) {
                try {
                    await switchChainAsync({ chainId: sepolia.id });
                } catch {}
            }
            setOpen(false)
            // navigate('/app');
        } catch (e) {
            console.error("connect error:", e);
        } finally {
            setSelecting(null);
        }
    };
    useEffect(() => {
        if (isConnected) {
            // 如果已连接，跳转到主页面
            navigate('/app'); // 假设主页面路由是 '/main'
        }
    }, [isConnected, navigate]); // 依赖项是 isConnected 和 navigate

    return (
        <div className="bg-black text-white min-h-screen flex flex-col">
            {/* Header */}
            <header className="flex justify-between items-center p-6 bg-black absolute top-0 left-0 right-0 z-10 border-b border-b-gray-800">
                <div className="w-[60%] flex justify-between items-center m-auto">
                    <div
                        className="text-2xl font-semibold text-transparent bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text">
                        MindFi
                    </div>
                    <nav className="space-x-8">
                        <a href="#docs" className="hover:text-purple-500 transition">Docs</a>
                        <a href="#pricing" className="hover:text-purple-500 transition">Pricing</a>
                        <a href="#faq" className="hover:text-purple-500 transition">FAQ</a>
                    </nav>
                </div>
            </header>

            {/* Main Cover Content */}
            <div className="flex flex-grow flex-col justify-center items-center text-center px-4 py-32 mt-16">
                <div className="max-w-4xl space-y-6">
                    <h1 className="text-8xl font-extrabold text-transparent bg-gradient-to-r from-purple-300 to-blue-500 bg-clip-text">
                        AI INFRA STRUCTURE FOR EVERYONE
                    </h1>
                    <p className="text-lg text-gray-300">
                        SPIN UP NEXT-GEN AI IN MINUTES OR SHIP IT TO YOUR SITE WITH JUST A FEW STEPS
                    </p>
                    <div className="flex justify-center h-14 space-x-4">
                        {/*<button className="bg-green-500 text-white py-3 px-6 rounded-full hover:bg-green-600 transition">*/}
                        {/*    TRY NOW*/}
                        {/*</button>*/}
                        {/*<button*/}
                        {/*    className="bg-transparent border-2 border-green-500 text-white py-3 px-6 rounded-full hover:bg-green-500 hover:text-black transition">*/}

                        {/*</button>*/}
                        <button
                            onClick={() => setOpen(true)}
                            className="px-12  rounded-full font-bold  hover:scale-105 transition-transform duration-300 hover:border-none
                             bg-transparent border-2 border-purple-500 text-white  hover:bg-gradient-to-br from-blue-800 via-indigo-600 to-purple-500"
                        >

                        {(status as string) === "connecting"
                                ? `${t("topBar.connecting")}`
                                : `${t("topBar.connect")}`}
                        </button>
                        <ChatModal open={open} onClose={() => setOpen(false)}>
                            {connectors.map((c) => {
                                const key = (c as any).uid ?? c.id;
                                const connectingThis =
                                    selecting === key && (status as string) === "connecting";

                                return (
                                    <button
                                        key={key}
                                        onClick={() => handlePick(c as Connector)}
                                        className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-100 text-left cursor-pointer
                               dark:hover:bg-gray-800"
                                    >
                                        {c.icon && (
                                            <img
                                                src={c.icon}
                                                alt={c.name}
                                                className="w-6 h-6 rounded-full"
                                            />
                                        )}
                                        <span className="font-medium">
                                          {c.name === "Injected" ? "默认钱包" : c.name}
                                            {connectingThis ? " · connecting" : ""}
                                        </span>
                                    </button>
                                );
                            })}
                        </ChatModal>
                    </div>
                </div>
                {/*<div className="mt-12 flex justify-center space-x-6">*/}
                {/*    <img src="https://via.placeholder.com/150" alt="Brand 1" className="w-20 h-20"/>*/}
                {/*    <img src="https://via.placeholder.com/150" alt="Brand 2" className="w-20 h-20"/>*/}
                {/*    <img src="https://via.placeholder.com/150" alt="Brand 3" className="w-20 h-20"/>*/}
                {/*    <img src="https://via.placeholder.com/150" alt="Brand 4" className="w-20 h-20"/>*/}
                {/*</div>*/}
            </div>
        </div>
    );
};

export default Cover;
