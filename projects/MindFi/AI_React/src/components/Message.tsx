import { Message } from "../stores/chatStore";

export default function MessageItem({ msg }: { msg: Message }) {
    const isUser = msg.role === "user";
    return (
        <div className={`flex ${isUser ? "justify-end" : "justify-start"} my-2`}>
            <div
                className={`max-w-[70%] px-4 py-2 rounded-2xl shadow ${
                    isUser
                        ? "bg-indigo-500 text-white rounded-br-none"
                        : "bg-gray-200 text-gray-800 rounded-bl-none"
                }`}
            >
                {msg.content}
            </div>
        </div>
    );
}
