import SidebarToggleButton from "@/components/SidebarToggleButton.tsx";
import {useSystemStore} from "@/stores/systemStore.ts";
import {useUIStore} from "@/stores/uiStore.ts";
import Sidebar from "@/components/Sidebar.tsx";
import {useEffect} from "react";
import {Outlet} from "react-router-dom";

export default function () {

    const { sidebarOpen } = useUIStore();
    const { theme } = useSystemStore(); // 获取当前主题
    useEffect(() => {
        // 根据当前主题状态切换 dark 类
        if (theme === "dark") {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }
    }, [theme]);
    return (
        <div className="h-screen w-screen p-3 flex">
            <div className="h-full w-full flex rounded-xl overflow-hidden">
                {/* 左侧：聊天列表 */}
                {/* 侧边栏 */}
                {sidebarOpen && <Sidebar />}

                {/* 右侧：主内容 */}
                <div className="flex flex-col flex-1 pl-4 bg-gray-50 dark:bg-[rgba(25,25,25,0.52)]">
                    {/* 顶部栏 */}
                    <div className="px-6 py-5 flex justify-between items-center
                    text-2xl font-bold">
                        TOP BAR
                    </div>

                    {/* Chat 占满剩余高度 */}
                    <div className="flex-1 overflow-hidden">
                        <Outlet />
                    </div>
                </div>
                <SidebarToggleButton />
            </div>

        </div>
    )
}