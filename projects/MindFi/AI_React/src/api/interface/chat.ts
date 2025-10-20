export interface ChatRequest {
    model: string;
    messages: { role: "user" | "assistant"; content: string }[];
    max_tokens?: number;
}

export interface ChatResponse {
    data: {
        choices: {
            message: { role: string; content: string };
        }[];
    };
}
