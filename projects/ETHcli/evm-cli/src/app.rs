use tokio::sync::mpsc;

pub struct Message {
    pub sender: String,
    pub content: String,
}

pub struct App {
    pub input: String,                      // 用户输入
    pub messages: Vec<Message>,             // 聊天记录
    pub rx: mpsc::Receiver<String>,         // 从 gRPC 接收消息
    pub tx: mpsc::Sender<String>,           // 发送到 UI
    pub scroll: u16,
    pub current_ai_message: String,         // 当前正在接收的 AI 消息
    pub is_streaming: bool,                 // 是否正在流式接收
    pub suggestion: String,                 // 自动补全建议
    pub animation_frame: usize,             // 动画帧
}


impl App {
    pub fn new(rx: mpsc::Receiver<String>, tx: mpsc::Sender<String>) -> Self {
        Self {
            input: String::new(),
            messages: vec![Message {
                sender: "AI".to_string(),
                content: "欢迎使用 EVM CLI! 我可以帮您管理以太坊资产和交易。".to_string(),
            }],
            rx,
            tx,
            scroll: 0,
            current_ai_message: String::new(),
            is_streaming: false,
            suggestion: String::new(),
            animation_frame: 0,
        }
    }

    pub fn push_message(&mut self, sender: String, content: String) {
        self.messages.push(Message { sender, content });
    }

    pub fn start_streaming(&mut self) {
        self.is_streaming = true;
        self.current_ai_message.clear();
    }

    pub fn append_stream(&mut self, content: &str) {
        self.current_ai_message.push_str(content);
    }
    
    pub fn finalize_ai_message(&mut self) {
        if self.is_streaming && !self.current_ai_message.is_empty() {
            let final_message = format!("✅ {}", self.current_ai_message);
            self.push_message("AI".to_string(), final_message);
            self.is_streaming = false;
            self.current_ai_message.clear();
        }
    }

    pub fn update_suggestion(&mut self) {
        self.suggestion.clear();
        if self.input == "/" {
            self.suggestion = "quit".to_string();
        }
    }

    pub fn accept_suggestion(&mut self) {
        self.input.push_str(&self.suggestion);
        self.suggestion.clear();
    }
}

