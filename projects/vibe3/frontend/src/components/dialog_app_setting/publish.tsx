import { Button } from '@/components/ui/button';
import { useWebContainer } from '@/providers/web-container';
import { useState, useCallback, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FiCopy, FiGlobe } from 'react-icons/fi';
import { toast } from 'sonner';
import { exportFileTreeFromWebContainer, fileTreeToZip, getMimeType } from '@/uitls/files';
import { updateApp } from '@/services/vibe3_api/apps';
import { publishApp } from '@/services/vibe3_api/build';
import { useFileTree } from '@/providers/file-tree';
import { isTextFileByExtension, uint8ArrayToBase64Url } from '@/uitls/files';
import { emitter } from '@/event_bus/emitter';

export interface DialogPublishProps {
    appid: string;
    disabled: boolean;
    onPublished?: () => void;
    onPublishing?: () => void;
}

export default function DialogPublish({ appid, disabled, onPublished, onPublishing }: DialogPublishProps) {
    const { getWebContainer, previewUrl } = useWebContainer();
    const { setFileTree } = useFileTree();

    const [open, setOpen] = useState(false);
    const [publishLoading, setPublishLoading] = useState(false);

    const [appName, setAppName] = useState('');
    const [appDescription, setAppDescription] = useState('');
    const [iconPath, setIconPath] = useState<null | string>(null);
    const [iconBase64, setIconBase64] = useState<null | string>(null);

    const handleCopyUrl = useCallback(async () => {
        navigator.clipboard.writeText(`https://${appid}.pages.dev`);
        toast.success('URL copied to clipboard');
    }, [appid]);

    const showDialog = useCallback(() => {
        setOpen(true);
    }, []);

    const applyAppMetadata = useCallback(async (appName: string, appDescription: string, appIcon?: string | null, iconBase64?: string | null) => {
        try {
            const webContainer = getWebContainer();
            if (!webContainer) {
                console.warn('WebContainer not available');
                return false;
            }

            let indexHtml = await webContainer.fs.readFile('/index.html', 'utf8');
            if (!indexHtml) {
                console.warn('index.html not found');
                return false;
            }

            let hasChanges = false;

            // 更新应用名称 (title)
            if (appName && appName.trim()) {
                const titleRegex = /<title[^>]*>.*?<\/title>/i;
                const newTitle = `<title>${appName.trim()}</title>`;

                if (titleRegex.test(indexHtml)) {
                    indexHtml = indexHtml.replace(titleRegex, newTitle);
                } else {
                    // 如果没有找到 title 标签，在 head 中添加
                    const headRegex = /<head[^>]*>/i;
                    if (headRegex.test(indexHtml)) {
                        indexHtml = indexHtml.replace(headRegex, `$&\n\t\t${newTitle}`);
                    }
                }
                hasChanges = true;
            }

            // 更新应用描述 (meta description)
            if (appDescription && appDescription.trim()) {
                const descriptionRegex = /<meta[^>]*name=["']description["'][^>]*>/i;
                const newDescription = `<meta name="description" content="${appDescription.trim()}">`;

                if (descriptionRegex.test(indexHtml)) {
                    indexHtml = indexHtml.replace(descriptionRegex, newDescription);
                } else {
                    // 如果没有找到 description meta 标签，在 head 中添加
                    const headRegex = /<head[^>]*>/i;
                    if (headRegex.test(indexHtml)) {
                        indexHtml = indexHtml.replace(headRegex, `$&\n\t\t${newDescription}`);
                    }
                }
                hasChanges = true;
            }

            // 更新应用图标
            if (appIcon && appIcon.trim() && iconBase64) {
                const iconRegex = /<link[^>]*rel=["']icon["'][^>]*>/i;
                const newIcon = `<link rel="icon" href="${appIcon}">`;

                if (iconRegex.test(indexHtml)) {
                    indexHtml = indexHtml.replace(iconRegex, newIcon);
                } else {
                    // 如果没有找到 icon link 标签，在 head 中添加
                    const headRegex = /<head[^>]*>/i;
                    if (headRegex.test(indexHtml)) {
                        indexHtml = indexHtml.replace(headRegex, `$&\n\t\t${newIcon}`);
                    }
                }
                const fileRes = await fetch(iconBase64);
                const arrayBuffer = await fileRes.arrayBuffer();
                webContainer.fs.writeFile(`public/${appIcon}`, new Uint8Array(arrayBuffer));

                hasChanges = true;
            }

            // 如果有更改，写回文件
            if (hasChanges) {
                await webContainer.fs.writeFile('/index.html', indexHtml);
                setFileTree(await exportFileTreeFromWebContainer(webContainer));
                console.log('应用元数据已更新到 index.html');
                return true;
            }

            return false;
        } catch (error) {
            console.error('更新应用元数据时出错:', error);
            return false;
        }
    }, [getWebContainer]);

    const handlePublishApp = useCallback(async () => {
        if (onPublishing) {
            onPublishing();
        }
        setPublishLoading(true);
        try {
            const webContainer = getWebContainer();
            if (!webContainer) {
                return;
            }

            // 首先应用元数据更改
            const updateMetadataLoading = toast.loading('Updating app metadata...');
            await applyAppMetadata(appName, appDescription, iconPath, iconBase64);
            toast.dismiss(updateMetadataLoading);
            const publishLoading = toast.loading('Publishing app...');
            const newFileTree = await exportFileTreeFromWebContainer(webContainer);
            const blob = await fileTreeToZip(newFileTree);
            const updateResponse = await updateApp(appid, blob);
            if (!updateResponse.success) {
                throw new Error(updateResponse.message);
            }

            await publishApp({
                appId: appid,
                zip: blob,
            });

            toast.dismiss(publishLoading);
            toast.success('App published successfully');
            setOpen(false);
        } catch (error) {
            console.error(error);
            toast.dismiss();
            toast.error('Failed to publish app');
        } finally {
            setPublishLoading(false);
            if (onPublished) {
                onPublished();
            }
        }
    }, [appid, appName, appDescription, iconPath, iconBase64, applyAppMetadata]);

    const getAppMetadata = useCallback(async () => {
        try {
            const webContainer = getWebContainer();
            if (!webContainer) {
                console.warn('WebContainer not available');
                return null;
            }

            const indexHtml = await webContainer.fs.readFile('/index.html', 'utf8');
            if (!indexHtml) {
                console.warn('index.html not found');
                return null;
            }

            // 解析应用名称
            const titleMatch = indexHtml.match(/<title[^>]*>(.*?)<\/title>/i);
            const appName = titleMatch?.[1]?.trim() || '';

            // 解析应用描述
            const descriptionMatch = indexHtml.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i);
            const appDescription = descriptionMatch?.[1]?.trim() || '';

            // 解析应用图标
            const iconMatch = indexHtml.match(/<link[^>]*rel=["']icon["'][^>]*href=["']([^"']*)["'][^>]*>/i);
            const appIcon = iconMatch?.[1] || '';

            // 更新状态
            if (appName) {
                setAppName(appName);
            }
            if (appDescription) {
                setAppDescription(appDescription);
            }
            if (appIcon) {
                setIconPath(appIcon);
                try {
                    const iconPath = appIcon.startsWith('/') ? `public${appIcon}` : `public/${appIcon}`;
                    if (isTextFileByExtension(appIcon)) {
                        const iconBase64 = await webContainer.fs.readFile(iconPath, 'base64');
                        setIconBase64(`data:${getMimeType(appIcon)};base64,` + iconBase64);
                    } else {
                        const iconBase64 = await webContainer.fs.readFile(iconPath);
                        const fixedIconBase64 = uint8ArrayToBase64Url(iconBase64).replace(/-/g, '+').replace(/_/g, '/');
                        setIconBase64(`data:${getMimeType(appIcon)};base64,` + fixedIconBase64);
                    }
                } catch (error) {
                    console.warn('无法读取图标文件:', appIcon, error);
                    setIconBase64(null);
                }
            }

            const metadata = {
                appName,
                appDescription,
                appIcon,
            };

            console.log('解析到的应用元数据:', metadata);
            return metadata;
        } catch (error) {
            console.error('解析应用元数据时出错:', error);
            return null;
        }
    }, [getWebContainer]);

    const handleSaveSettings = useCallback(async () => {
        await applyAppMetadata(appName, appDescription, iconPath, iconBase64);
        emitter.emit('autoSaveApp');
    }, [appName, appDescription, iconPath, iconBase64, applyAppMetadata]);

    useEffect(() => {
        getAppMetadata();
    }, [appid]);

    const handleUploadIcon = async () => {
        return new Promise((resolve, reject) => {
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = 'image/*';
            fileInput.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) {
                    // to base64
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const base64 = e.target?.result as string;
                        setIconBase64(base64);
                        const fileExtension = file.name.split('.').pop();
                        setIconPath(`favicon.${fileExtension}`);
                        resolve(base64);
                    };
                    reader.readAsDataURL(file);
                }
            };
            fileInput.click();
        })
    }

    return (
        <div className='w-full'>
             <div>
                <h3 className="text-lg font-semibold mb-1">Publish</h3>
                <p className="text-sm text-muted-foreground mb-6">
                    Set up your app and publish.
                </p>
            </div>
            <div className='flex flex-col gap-3'>
                <div className='flex flex-col gap-2'>
                    <Label htmlFor="app-name" className='text-sm font-semibold'>Website Title & Icon</Label>
                    <div className='flex flex-row gap-2'>
                        <Button variant='outline' size='icon'
                            onClick={handleUploadIcon}
                            className='cursor-pointer text-gray-500 grow-0'>
                            {
                                iconBase64 ? (
                                    <img crossOrigin='anonymous' src={iconBase64} alt="Icon" className='w-6 h-6' />
                                ) : (
                                    <FiGlobe size={24} />
                                )
                            }
                        </Button>
                        <Input type='text' id='app-name' placeholder='Website Title' value={appName} onChange={(e) => setAppName(e.target.value)} />
                    </div>
                </div>
                <div className='flex flex-col gap-2'>
                    <Label htmlFor="app-description" className='text-sm font-semibold'>Description</Label>
                    <Input type='text' id='app-description' placeholder='Website Description' value={appDescription} onChange={(e) => setAppDescription(e.target.value)} />
                </div>
                <div className='flex flex-col gap-2'>
                    <Label htmlFor="app-url" className='text-sm font-semibold'>URL</Label>
                    <div className='flex flex-row gap-2'>
                        <Input type='text' id='app-url' readOnly
                            value={`https://${appid}.pages.dev`} />
                        <Button variant='outline' size='icon' onClick={handleCopyUrl}
                            className='cursor-pointer  grow-0'>
                            <FiCopy size={16} />
                        </Button>
                    </div>
                </div>
            </div>
            <div className='flex flex-row gap-2 my-4 justify-end'>
                <Button variant='outline' size='sm'
                    className='cursor-pointer' onClick={handleSaveSettings} disabled={publishLoading}>
                    Save Settings
                </Button>
                <Button variant='default' size='sm'
                    className='cursor-pointer !bg-green-500 hover:!bg-green-500/80 h-8 text-background'
                    onClick={handlePublishApp} disabled={publishLoading}>
                    Publish
                </Button>
            </div>
        </div>
    )
}