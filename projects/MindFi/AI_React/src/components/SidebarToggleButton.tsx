import { ChevronRight } from "lucide-react";
import { useUIStore } from "@/stores/uiStore";

export default function SidebarToggleButton() {
    const { sidebarOpen, toggleSidebar } = useUIStore();

    if (sidebarOpen) return null;

    return (
        <button
            onClick={toggleSidebar}
            className="absolute top-1/2 left-2 -translate-y-1/2
                       p-2 rounded shadow border transition
                       bg-white border-gray-300 text-gray-700 hover:bg-gray-100
                       dark:bg-gray-900 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
        >
            <ChevronRight size={18} />
        </button>
    );
}
