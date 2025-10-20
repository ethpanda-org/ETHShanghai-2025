import { useState, useEffect } from "react";
import { type EnvItem, createOrUpdateEnvs, batchDeleteEnvs } from "@/services/vibe3_api/envs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FiEye, FiEyeOff, FiTrash2, FiPlus } from "react-icons/fi";
import { toast } from "sonner";
import { useWebContainer } from '@/providers/web-container';
import { useFileTree } from '@/providers/file-tree';

interface EnvItemWithVisibility extends EnvItem {
    isVisible?: boolean;
    isNew?: boolean;
}

export default function Envs({ data, appId }: { data: EnvItem[], appId: string }) {
    const [envs, setEnvs] = useState<EnvItemWithVisibility[]>(
        data.map(env => ({ ...env, isVisible: false }))
    );
    const [originalKeys, setOriginalKeys] = useState<string[]>(data.map(env => env.key));
    const [isSaving, setIsSaving] = useState(false);
    const { getWebContainer } = useWebContainer();
    const { setFileTree, fileTree } = useFileTree();

    useEffect(() => {
        setEnvs(data.map(env => ({ ...env, isVisible: false })));
        setOriginalKeys(data.map(env => env.key));
    }, [data]);

    const handleAddNew = () => {
        setEnvs([...envs, {
            key: "",
            value: "",
            created_at: "",
            updated_at: "",
            isVisible: true,
            isNew: true
        }]);
    };

    const handleDelete = (index: number) => {
        const newEnvs = envs.filter((_, i) => i !== index);
        setEnvs(newEnvs);
    };

    const handleKeyChange = (index: number, newKey: string) => {
        const newEnvs = [...envs];
        newEnvs[index].key = newKey;
        setEnvs(newEnvs);
    };

    const handleValueChange = (index: number, newValue: string) => {
        const newEnvs = [...envs];
        newEnvs[index].value = newValue;
        setEnvs(newEnvs);
    };

    const toggleVisibility = (index: number) => {
        const newEnvs = [...envs];
        newEnvs[index].isVisible = !newEnvs[index].isVisible;
        setEnvs(newEnvs);
    };

    const handleSave = async () => {
        // 验证所有环境变量的 key 和 value 都不为空
        const invalidEnvs = envs.filter(env => !env.key.trim() || !env.value.trim());
        if (invalidEnvs.length > 0) {
            toast.error("The value of the environment variable cannot be empty");
            return;
        }

        // 检查是否有重复的 key
        const keys = envs.map(env => env.key);
        const duplicateKeys = keys.filter((key, index) => keys.indexOf(key) !== index);
        if (duplicateKeys.length > 0) {
            toast.error(`The key ${duplicateKeys.join(", ")} is duplicated`);
            return;
        }

        setIsSaving(true);
        try {
            // 1. 找出需要删除的 keys（原来有但现在没有的）
            const currentKeys = envs.map(env => env.key);
            const keysToDelete = originalKeys.filter(key => !currentKeys.includes(key));

            // 2. 如果有需要删除的 keys，先删除它们
            if (keysToDelete.length > 0) {
                await batchDeleteEnvs(appId, keysToDelete);
            }

            // 3. 保存或更新当前的环境变量
            if (envs.length > 0) {
                const kvPair: Record<string, string> = {};
                envs.forEach(env => {
                    kvPair[env.key] = env.value;
                });
                await createOrUpdateEnvs(appId, kvPair);
                const webContainer = getWebContainer();
                if (webContainer && fileTree) {
                    await webContainer.fs.writeFile('.env', envs.map(env => `${env.key}=${env.value}`).join('\n'));
                    const newFileTree = { ...fileTree, '.env': {
                        file: {
                            contents: envs.map(env => `${env.key}=${env.value}`).join('\n'),
                        },
                    } };
                    setFileTree(newFileTree);
                }
            }

            toast.success("Environment variable saved successfully");

            // 4. 更新原始 keys 和状态
            setOriginalKeys(currentKeys);
            setEnvs(envs.map(env => ({ ...env, isNew: false })));
        } catch (error: any) {
            toast.error(error.message || "Save failed");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="w-full">
            <div>
                <h3 className="text-lg font-semibold mb-1">Environment Variables</h3>
                <p className="text-sm text-muted-foreground mb-6">
                    Manage the environment variables of the project.
                </p>
            </div>

            <div className="flex flex-col gap-2">
                {
                    envs.length > 0 && (
                        <div className="flex items-center">
                            <div className="flex-1 text-sm font-semibold">Key</div>
                            <div className="flex-1 text-sm font-semibold">Value</div>
                        </div>
                    )
                }
                {envs.map((env, index) => (
                    <div key={index} className="flex items-center gap-2">
                        <Input
                            placeholder="KEY"
                            value={env.key}
                            onChange={(e) => handleKeyChange(index, e.target.value)}
                            className="flex-1"
                        />
                        <div className="flex-1 relative">
                            <Input
                                type={env.isVisible ? "text" : "password"}
                                placeholder="VALUE"
                                value={env.value}
                                onChange={(e) => handleValueChange(index, e.target.value)}
                                className="pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => toggleVisibility(index)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            >
                                {env.isVisible ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                            </button>
                        </div>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleDelete(index)}
                            className="shrink-0"
                        >
                            <FiTrash2 size={16} />
                        </Button>
                    </div>
                ))}
            </div>

            <div className="flex gap-2 mt-6 justify-end">
                <Button
                    size='sm'
                    variant="outline"
                    onClick={handleAddNew}
                    className="flex items-center gap-2"
                >
                    <FiPlus size={16} />
                    Add Variable
                </Button>
                <Button variant='default' size='sm'
                    className='cursor-pointer !bg-green-500 hover:!bg-green-500/80 h-8 text-background'
                    onClick={handleSave} disabled={isSaving}>
                     {isSaving ? "Saving..." : "Save"}
                </Button>
            </div>
        </div>
    )
}