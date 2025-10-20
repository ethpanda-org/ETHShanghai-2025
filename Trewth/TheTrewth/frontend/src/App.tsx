import React, { useState } from "react";
import TabNavigation from "./components/TabNavigation";
import TokenLaunch from "./components/TokenLaunch";
import Trading from "./components/Trading";
import EventCoinMonitor from "./components/EventCoinMonitor";
import Session from "./components/AgentInteraction/Session";

function App() {
    const [activeTab, setActiveTab] = useState("token-launch");
    const [selectedTradingPoolId, setSelectedTradingPoolId] = useState<string>("");
    const [askAIMessage, setAskAIMessage] = useState<string>("");

    const tabs = [
        { id: "token-launch", label: "Token Launch", icon: "🚀" },
        { id: "trading", label: "Trading", icon: "💱" },
        { id: "monitor", label: "Event Monitor", icon: "📊" },
        { id: "agent", label: "AI Agent (DEMO)", icon: "🤖" }
    ];

    const renderContent = () => {
        switch (activeTab) {
            case "token-launch":
                return <TokenLaunch />;
            case "trading":
                return <Trading initialPoolId={selectedTradingPoolId || undefined} onAskAI={(msg:string)=>{ setAskAIMessage(msg); setActiveTab('agent'); }} />;
            case "monitor":
                return <EventCoinMonitor onSelectPool={(pid: string)=>{ setSelectedTradingPoolId(pid); setActiveTab('trading'); window.scrollTo({top:0,behavior:'smooth'}); }} />;
            case "agent":
                return <Session injectedAgentMessage={askAIMessage} onMessageConsumed={()=> setAskAIMessage("")} />;
            default:
                return <TokenLaunch />;
        }
    };

    return (
        <div className="App" style={appStyle}>
            <TabNavigation 
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={setActiveTab}
            />
            <div style={contentContainerStyle}>
                <div style={contentInnerStyle}>
                    {renderContent()}
                </div>
            </div>
        </div>
    );
}

// 应用整体样式
const appStyle: React.CSSProperties = {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
    display: 'flex',
    flexDirection: 'column',
};

const contentContainerStyle: React.CSSProperties = {
    flex: 1,
    padding: '32px 24px',
    overflowY: 'auto',
};

const contentInnerStyle: React.CSSProperties = {
    maxWidth: '1400px',
    margin: '0 auto',
    background: 'white',
    borderRadius: '20px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.08)',
    padding: '32px',
    minHeight: 'calc(100vh - 180px)',
};

export default App;