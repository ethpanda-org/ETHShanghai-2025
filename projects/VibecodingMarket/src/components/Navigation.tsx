import { Button } from "@/components/ui/button";
import { Code2, Wallet, LogOut } from "lucide-react";
import { Link } from "react-router-dom";
import { useWallet } from "@/hooks/useWallet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Navigation = () => {
  const { address, isConnecting, connectWallet, disconnectWallet, formatAddress } = useWallet();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="bg-gradient-primary p-2 rounded-lg">
            <Code2 className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            VibeCoding Market
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-6">
          <Link to="/marketplace" className="text-muted-foreground hover:text-foreground transition-colors">
            任务市场
          </Link>
          <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
            接单中心
          </Link>
          <Link to="/how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">
            如何运作
          </Link>
        </div>

        <div className="flex items-center gap-3">
          {address ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="gradient" size="sm">
                  <Wallet className="w-4 h-4" />
                  {formatAddress(address)}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-background border-border z-50">
                <DropdownMenuItem onClick={disconnectWallet}>
                  <LogOut className="w-4 h-4 mr-2" />
                  断开连接
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button 
              variant="gradient" 
              size="sm" 
              onClick={connectWallet}
              disabled={isConnecting}
            >
              <Wallet className="w-4 h-4" />
              {isConnecting ? "连接中..." : "Connect Wallet"}
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
