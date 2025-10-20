import MarkdownViewer from "@/components/MarkdownViewer.tsx";
import {useStatusStore} from "@/stores/useStatusStore.ts";
import { useState, useRef, useEffect } from "react";
import { useChatStore } from "@/stores/chatStore";
import { useAccount } from "wagmi";
import { API } from "@/api";
import { useTranslation } from "react-i18next";
import { Send } from "lucide-react";

export default function Chat() {
    const { sessions, activeId, addMessage } = useChatStore();
    const activeSession = sessions.find((s) => s.id === activeId) ?? sessions[0];

    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const { address } = useAccount();
    const { t } = useTranslation();
    const { setStatusInfo } = useStatusStore();

    const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
    const messagesEndRef = useRef<HTMLDivElement | null>(null); // ⬅️ 新增：滚动定位点

    // 每次消息变化后自动滚动到底
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [activeSession.messages]);

    async function refreshStatus() {
        if (!address) return;
        const res = await API.accessGetStatus(address);
        setStatusInfo(res.data);
    }

    async function sendMessage() {
        if (!input.trim() || !address) return;
        addMessage("user", input);
        const userInput = input;
        setInput("");
        setLoading(true);

        try {
            const res = await API.chatSend(address, {
                model: "deepseek-chat",
                messages: [{ role: "user", content: userInput }],
                max_tokens: 512,
            });
            addMessage("assistant", res.data.reply || "not content");
        } catch (e: any) {
            addMessage("assistant", `${t("chat.error")}: ${e}`);
        } finally {
            setLoading(false);
            await refreshStatus();
        }
    }

    return (
        <div className="flex-1 flex flex-col h-full  transition-colors">
            {/* 消息区 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {activeSession.messages.length > 0 ? (
                    activeSession.messages.map((m) => (
                        <div
                            key={m.id}
                            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                            <div
                                className={`px-4 py-2 rounded-2xl max-w-[75%] whitespace-pre-wrap break-words
                                    ${m.role === "user"
                                    ? "bg-indigo-500 text-white dark:bg-indigo-600"
                                    : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100"
                                }`}
                            >
                                <MarkdownViewer source={m.content} />
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="w-full h-full flex justify-center items-center">
                        <h1 className="text-gray-500 dark:text-gray-300">{t("chat.introduce")}</h1>
                    </div>
                )}
                {/* ⬇️ 滚动定位点 */}
                <div ref={messagesEndRef} />
            </div>

            {/* 输入区 */}
            <div className="border-t bg-gray-50 dark:bg-gray-800 dark:border-gray-600 p-4 transition-colors">
                <div className="flex items-end gap-2">
                    <textarea
                        ref={textAreaRef}
                        className="flex-1 border rounded-2xl px-4 py-2 resize-none shadow-sm
                                   focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400
                                   dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100
                                   placeholder-gray-400 dark:placeholder-gray-500
                                   transition-colors max-h-[10rem] overflow-auto"
                        rows={1}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                sendMessage();
                            }
                        }}
                        placeholder={t("chat.inputPlaceholder")}
                    />
                    <button
                        onClick={sendMessage}
                        disabled={!address || loading}
                        className="flex items-center gap-1 px-4 py-2 rounded-2xl bg-indigo-600 text-white font-medium
                                   hover:bg-indigo-700 disabled:opacity-50
                                   dark:bg-indigo-500 dark:hover:bg-indigo-600 transition"
                    >
                        <Send size={16} />
                        {loading ? t("chat.sending") : t("chat.send")}
                    </button>
                </div>
            </div>
        </div>
    );
}
