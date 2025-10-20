'use client';
import { Button } from "@/components/ui/button"
import { OAuthHandler, type OAuthScope } from '@instantdb/platform';
import { useEffect, useState } from "react";
import dayjs from "dayjs";
import { toast } from "sonner";
import { FiExternalLink } from "react-icons/fi"

export default function Instantdb({ appid }: { appid: string }) {
    const [connected, setConnected] = useState(false);
    const [expiresAt, setExpiresAt] = useState<Date | null>(null);

    const handleConnect = async () => {
        const oauthHandler = new OAuthHandler({
            clientId: process.env.NEXT_PUBLIC_INSTANTDB_OAUTH_CLIENT_ID!,
            redirectUri: `${window.location.origin}/oauth/instant/redirect`,
        });

        const scopes: OAuthScope[] = ['apps-write'];
        try {
            const token = await oauthHandler.startClientOnlyFlow(scopes) as { token: string, expiresAt: Date };
            document.cookie = `instantdb_token=${token.token}; expires=${token.expiresAt.toUTCString()}; path=/`;
            document.cookie = `instantdb_token_expires_at=${token.expiresAt.toUTCString()}; path=/`;
            setConnected(true);
            setExpiresAt(token.expiresAt);
            toast.success('Connected to Instantdb');
        } catch (error) {
            console.error(error);
            toast.error((error as any).message || 'Failed to connect to Instantdb');
        }
    }

    const handleDisconnect = () => {
        document.cookie = `instantdb_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
        setConnected(false);
        setExpiresAt(null);
    }

    useEffect(() => {
        if (window) {
            const token = document.cookie.split('; ').find(row => row.startsWith('instantdb_token='))?.split('=')[1];
            const expiresAt = document.cookie.split('; ').find(row => row.startsWith('instantdb_token_expires_at='))?.split('=')[1];
            if (token && expiresAt) {
                setExpiresAt(new Date(expiresAt));
                setConnected(true);
            } else {
                setConnected(false);
            }
        } else {
            setConnected(false);
        }
    }, []);

    return (
        <div className="w-full flex flex-col gap-8 h-full">
            <div>
                <h3 className="text-lg font-semibold mb-1">Instantdb</h3>
                <p className="text-sm text-muted-foreground mb-6">
                    Use Instantdb to manage your database.
                </p>
            </div>

            <div className="flex-1">
                <div className="flex flex-row gap-2 justify-between items-center">
                    <div className="text-sm">
                        Connect to Instantdb to enable database features.
                        {
                            connected && <div className="text-xs text-muted-foreground">
                                Expires at {dayjs(expiresAt).format('YYYY-MM-DD HH:mm:ss')}
                            </div>
                        }
                    </div>

                    {
                        connected ? <Button
                            onClick={handleDisconnect}
                            size="sm"
                            className="cursor-pointer bg-green-500 hover:bg-green-500/80 text-background">
                            Disconnect
                        </Button> : <Button
                            onClick={handleConnect}
                            size="sm"
                            className="cursor-pointer bg-green-500 hover:bg-green-500/80 text-background">
                            Connect
                        </Button>
                    }

                </div>
            </div>

            <div className="mt-8 text-center flex justify-end">
                <a href="https://www.instantdb.com/" target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-muted-foreground hover:text-green-500 hover:underline">
                    Learn more about Instantdb
                    <FiExternalLink className="w-4 h-4" />
                </a>
            </div>
        </div>
    )
}