declare module 'chat-snail-sdk' {
  interface AIChatWidgetConfig {
    // Appearance
    position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
    theme?: 'light' | 'dark';
    primaryColor?: string;
    width?: number;
    height?: number;
    zIndex?: number;

    // Content
    title?: string;
    subtitle?: string;
    welcomeMessage?: string;
    placeholder?: string;
    buttonIcon?: string;
    userAvatar?: string;
    botAvatar?: string;

    // Behavior
    language?: 'en' | 'zh' | 'es' | 'fr' | 'ja';
    enableDrag?: boolean;
    autoOpen?: boolean;
    autoOpenDelay?: number;
    persistConversation?: boolean;
    maxMessageLength?: number;

    // API Configuration
    apiEndpoint?: string;
    apiKey?: string;
    apiProvider?: 'custom' | 'dify';
    difyConfig?: {
      baseUrl?: string;
      user?: string;
      streaming?: boolean;
    };

    // Advanced Features
    enableFileUpload?: boolean;
    enableVoiceInput?: boolean;
    animations?: {
      enabled?: boolean;
      duration?: number;
    };
    sounds?: {
      enabled?: boolean;
      newMessage?: string;
      sendMessage?: string;
    };
  }

  class AIChatWidget {
    constructor(config?: AIChatWidgetConfig);
    init(): this;
    destroy(): void;
    toggle(): void;
    open(): void;
    close(): void;
    sendMessage(message: string): void;
    setTheme(theme: 'light' | 'dark'): void;
    setLanguage(language: string): void;
    on(event: string, callback: (data?: any) => void): void;
    off(event: string, callback: (data?: any) => void): void;
  }

  export default AIChatWidget;
}
