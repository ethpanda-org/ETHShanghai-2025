import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { FiEdit3, FiSave, FiX } from "react-icons/fi"
import { useState, useCallback, useRef } from "react";
import { type AppOverviewResponse } from "@/services/vibe3_api/apps";
import { updateAppInfo } from "@/services/vibe3_api/apps";
import dayjs from "dayjs";
import { toast } from "sonner";
import { emitter } from "@/event_bus/emitter";

export default function Overview({ data }: { data?: AppOverviewResponse }) {
    const  nameRef = useRef<string>(data?.data.app.name || '');
    const [editingName, setEditingName] = useState(false);
    const [appName, setAppName] = useState(data?.data.app.name || '');
    const [updating, setUpdating] = useState(false);

    const handleSaveName = useCallback(async () => {
        if (!data) {
            return
        }
        setUpdating(true);
        try {
            await updateAppInfo({ name: appName, id: data.data.app.id });
            nameRef.current = appName;
            handleCancelName()
            toast.success('App name updated successfully');
            emitter.emit('updateAppName', appName);
        } catch (error) {
            console.error(error);
            toast.error('Failed to update app name');
        } finally {
            setUpdating(false);
        }
    }, [appName, data]);

    const handleCancelName = useCallback(() => {
        setEditingName(false);
        setAppName(nameRef.current || '');
    }, []);

    if (!data) {
        return null
    }

    return (
        <div className="w-full">
            <div>
                <h3 className="text-lg font-semibold mb-1">Overview</h3>
                <p className="text-sm text-muted-foreground mb-6">
                    Manage your app details.
                </p>
            </div>
            <div className="space-y-4">
                <div className="text-sm grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                        <span className="font-semibold flex flex-row items-center">Name
                        </span>

                        {
                            editingName ? (
                                <div className="flex flex-row gap-1">
                                    <Input type="text" value={appName} onChange={(e) => setAppName(e.target.value)}
                                        className="!ring-0 !bg-transparent border-input" />
                                    <Button variant="outline" onClick={handleSaveName} disabled={updating}>
                                        <FiSave size={14} className="text-green-500 " />
                                    </Button>
                                    <Button variant="outline" onClick={handleCancelName} disabled={updating}>
                                        <FiX size={14} className="text-red-500 " />
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex flex-row gap-1 items-center">
                                    <span className="text-sm text-muted-foreground">{appName}</span>
                                    <FiEdit3 onClick={() => setEditingName(!editingName)} size={15}
                                        className="cursor-pointer text-green-500/80 hover:text-green-500" />
                                </div>

                            )
                        }
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="font-semibold">ID</span>
                        <span className="text-sm text-muted-foreground">{data.data.app.id}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="font-semibold">Created at</span>
                        <span className="text-sm text-muted-foreground">{dayjs(data.data.app.created_at).format("YYYY-MM-DD HH:mm")}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="font-semibold">Updated at</span>
                        <span className="text-sm text-muted-foreground">{dayjs(data.data.app.updated_at).format("YYYY-MM-DD HH:mm")}</span>
                    </div>

                    <div className="flex flex-col gap-1">
                        <span className="font-semibold">Owner</span>
                        <span className="text-sm text-muted-foreground">
                            {data.data.app.owner?.nickname
                                || data.data.app.owner?.email
                                || data.data.app.owner?.eth_address
                                || data.data.app.owner?.id}
                        </span>
                    </div>

                    <div className="flex flex-col gap-1">
                        <span className="font-semibold">Messages count</span>
                        <span className="text-sm text-muted-foreground">
                            {data.data.messages}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    )
}