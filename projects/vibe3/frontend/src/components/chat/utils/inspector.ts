import { WebContainer } from "@webcontainer/api";

export async function switchInspectorMode(active: boolean, webContainer: WebContainer) {
    try {
        // 读取现有的.env文件
        let envContent = '';
        try {
            envContent = await webContainer.fs.readFile('.env', 'utf8');
        } catch (error) {
            // 如果.env文件不存在，创建一个新的
            console.log('Creating new .env file');
        }

        // 使用正则表达式来精确匹配和替换VITE_INSPECTOR_MODE
        const inspectorModeRegex = /^VITE_INSPECTOR_MODE=.*$/m;
        
        let newEnvContent: string;
        
        if (active) {
            // 启用模式：如果存在则更新，不存在则添加
            if (inspectorModeRegex.test(envContent)) {
                // 替换现有的VITE_INSPECTOR_MODE行
                newEnvContent = envContent.replace(inspectorModeRegex, 'VITE_INSPECTOR_MODE=true');
            } else {
                // 添加新的VITE_INSPECTOR_MODE行
                const trimmedContent = envContent.trim();
                if (trimmedContent === '') {
                    // 空文件，直接添加
                    newEnvContent = 'VITE_INSPECTOR_MODE=true';
                } else {
                    // 非空文件，在末尾添加
                    newEnvContent = envContent + '\nVITE_INSPECTOR_MODE=true';
                }
            }
        } else {
            // 禁用模式：删除VITE_INSPECTOR_MODE行
            if (inspectorModeRegex.test(envContent)) {
                // 删除VITE_INSPECTOR_MODE行，包括前后的空行
                newEnvContent = envContent.replace(inspectorModeRegex, '').replace(/\n\n+/g, '\n').trim();
            } else {
                // 如果不存在，保持原样
                newEnvContent = envContent;
            }
        }

        // 写入更新后的.env文件
        await webContainer.fs.writeFile('.env', newEnvContent);
        return { success: true, message: `Inspector mode ${active ? 'enabled' : 'disabled'}` };
    } catch (error) {
        console.error('switchInspectorMode error', error);
        return { success: false, message: error instanceof Error ? error.message : 'Failed to switch inspector mode' };
    }
}

export async function getInspectorMode(webContainer: WebContainer): Promise<boolean> {
    try {
        const envContent = await webContainer.fs.readFile('.env', 'utf8');
        const lines = envContent.split('\n');
        
        for (const line of lines) {
            const trimmedLine = line.trim();
            
            // 跳过空行和注释行
            if (!trimmedLine || trimmedLine.startsWith('#')) {
                continue;
            }
            
            // 检查是否是VITE_INSPECTOR_MODE行且值为true
            if (trimmedLine.startsWith('VITE_INSPECTOR_MODE=')) {
                const value = trimmedLine.split('=')[1]?.trim();
                return value === 'true';
            }
        }
        
        return false;
    } catch (error) {
        console.error('getInspectorMode error', error);
        return false;
    }
}