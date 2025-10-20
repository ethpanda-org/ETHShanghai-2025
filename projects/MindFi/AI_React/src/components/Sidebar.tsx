// import {usePrefersDark} from "@/hooks/usePrefersDark.ts";
import {API} from "@/api";
import {useChatStore} from "@/stores/chatStore";
import {useUIStore} from "@/stores/uiStore.ts";
import {useUserStore} from "@/stores/userStore.ts";
import {hiddenMiddle} from "@/utils/addressUtils.ts";
import {CopyOutlined, CreditCardOutlined, LogoutOutlined} from "@ant-design/icons";
import {Modal} from "antd";
// import {use} from "i18next";
import {ChevronLeft} from "lucide-react";
import {useEffect, useState} from "react";
import {useTranslation} from "react-i18next";
import {Link, useLocation, useNavigate} from "react-router-dom";
import {useAccount, useBalance, useDisconnect} from "wagmi";

export default function Sidebar() {
    const {disconnect} = useDisconnect();
    const {toggleSidebar} = useUIStore();
    const {t} = useTranslation();
    const {address, isConnected} = useAccount();
    const {data: balance} = useBalance({
        address,  // 获取当前钱包地址的余额
    });
    // const [user, setUser] = useState({});
    const {clearAll} = useChatStore();
    // const isDark = usePrefersDark();
    // console.log(isDark)
    const [isOpen, setIsOpen] = useState(false);
    // 使用zustand来获取和设置用户信息
    const {
        avatar_url,
        setUserInfo
    } = useUserStore();
    const toggleMenu = () => {
        setIsOpen(!isOpen);
    };
    const copyAddress = () => {
        navigator.clipboard.writeText(address as string);  // 将地址复制到剪贴板
        toggleMenu()
        // alert('Address copied to clipboard!');
    };

    const navigate = useNavigate(); // 用于页面跳转
    useEffect(() => {
        if (!isConnected) {
            // 如果已连接，跳转到主页面
            navigate('/'); // 假设主页面路由是 '/main'
        }
        getPersonal()
    }, [isConnected, navigate]); // 依赖项是 isConnected 和 navigate
    const location = useLocation();

    // 定义路由和对应的文本
    const navItems = [
        {path: "hub", label: "MCP HUB"},
        {path: "my", label: "My Project"},
        {path: "store", label: "Store"},
    ];

    async function getPersonal() {
        if (!address) return;
        const res = await API.personal({address: address});
        if (res.ok) {
            // setUser(res.data);
            setUserInfo(res.data);
        }
        console.log(res)
    }


    const onDisconnect = () => {
        Modal.confirm({
            title: `${t("sidebar.modalText.title")}`,
            content: `${t("sidebar.modalText.content")}`,
            okText: `${t("sidebar.modalText.ok")}`,
            cancelText: `${t("sidebar.modalText.cancel")}`,
            onOk: () => {
                // 删除会话
                disconnect();
                clearAll();
            },
        });
    };
    const formattedBalance = balance?.formatted
        ? parseFloat(balance.formatted).toFixed(5)  // 保留5位小数
        : '0.00000';
    return (
        <div className="w-64 flex flex-col bg-gray-50 dark:bg-[rgba(25,25,25,0.52)] p-2">
            {/* 顶部 */}
            <div className="p-3 h-20 flex items-center justify-between dark:bg-[rgba(25,25,25,0.52)]">
                <h2 className="text-3xl font-semibold text-transparent bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text">
                    MindFi
                </h2>

                <div className="flex items-center space-x-2">
                    <button
                        onClick={toggleSidebar}
                        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                    >
                        <ChevronLeft size={18} className="text-gray-600 dark:text-gray-300"/>
                    </button>
                </div>
            </div>

            {/* 会话列表 */}
            <div
                className="flex-1 flex  flex-col overflow-y-auto p-2 space-y-2 dark:bg-[rgba(30,30,30,0.52)] rounded-2xl">
                <div className="w-full flex-grow space-y-2">
                    {navItems.map((item) => (
                        <Link key={item.path} to={item.path}>
                            <div
                                className={`hover:shadow-[0px_2px_4px_rgba(244,220,213,0.7)] shadow-xl cursor-pointer w-full h-12 rounded-full flex justify-center items-center my-4
              ${location.pathname === `/app/${item.path}` ? 'bg-gradient-to-br from-blue-800 via-indigo-600 to-purple-500' : 'hover:bg-gradient-to-br from-blue-800 via-indigo-600 to-purple-500'} 
              text-white font-bold`}
                            >
                                {item.label}
                            </div>
                        </Link>
                    ))}

                </div>
                <div className="h-32 w-full flex flex-col justify-around">
                    <div
                        className="hover:shadow-[0px_4px_6px_rgba(244,220,213,0.7)]
                        shadow-xl cursor-pointer w-full h-12 rounded-xl pl-4 text-white
                        hover:bg-gradient-to-br from-blue-800 via-indigo-600 to-purple-500
                        flex justify-start items-center dark:bg-[rgba(60,60,60,0.52)]"
                    >
                        <CreditCardOutlined/>
                        <span className="px-3 py-1 text-sm font-medium">
                              {formattedBalance} {balance?.symbol}
                            </span>
                    </div>
                    <div className="cursor-pointer relative dark:bg-[rgba(60,60,60,0.52)] rounded-2xl hover:shadow-lg">
                        {/* 用户头像和展开按钮 */}
                        <div
                            className="flex items-center justify-around h-16 rounded-2xl overflow-hidden cursor-pointer
                                                hover:bg-gradient-to-br from-blue-800 via-indigo-600 to-purple-500
                            "
                            onClick={toggleMenu}>
                            <div
                                className=" w-10 h-10 rounded-full flex items-center justify-center text-white">
                                {/*<span className="text-sm">A</span> /!* 用于显示头像的初始字母 *!/*/}
                                {avatar_url ? (
                                    <img className="w-full h-full rounded-full" src={avatar_url} alt="User Avatar"/>
                                ) : (
                                    <span className="text-sm">A</span>
                                )}
                            </div>
                            <span className="ml-2 text-white">{hiddenMiddle(address as string)}</span>
                            <svg xmlns="http://www.w3.org/2000/svg" className="ml-2 w-4 h-4 text-white"
                                 viewBox="0 0 20 20"
                                 fill="currentColor">
                                <path fillRule="evenodd"
                                      d="M5.23 7.23a.75.75 0 011.06 0L10 10.44l3.71-3.71a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0l-4.25-4.25a.75.75 0 010-1.06z"
                                      clipRule="evenodd"/>
                            </svg>
                        </div>

                        {/* 菜单弹出 */}
                        {isOpen && (
                            <div
                                className="absolute -top-28 w-full h-24 right-0 mt-2 bg-gray-800 text-white rounded-lg shadow-lg z-10">
                                <ul className="p-2 mb-2">
                                    <li>
                                        <button onClick={copyAddress}
                                                className="block w-full text-left px-4 py-2 rounded-xl
                                                hover:bg-gradient-to-br from-blue-800 via-indigo-600 to-purple-500
                                                ">
                                            <CopyOutlined/>
                                            <span className="px-3 py-1 text-sm font-medium">
                                               Copy Address
                                            </span>

                                        </button>
                                    </li>
                                    <li>
                                        <button onClick={onDisconnect}
                                                className="block w-full text-left px-4 py-2 rounded-xl
                                                hover:bg-gradient-to-br from-blue-800 via-indigo-600 to-purple-500
                                                ">
                                            <LogoutOutlined/>
                                            <span className="px-3 py-1 text-sm font-medium">
                                               Sign out
                                            </span>

                                        </button>
                                    </li>
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
