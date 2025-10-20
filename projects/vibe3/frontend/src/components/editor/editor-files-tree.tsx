import { FileSystemTree } from '@webcontainer/api';
import { Tree, type NodeApi, NodeRendererProps } from 'react-arborist';
import { useMemo, useRef, useState, useEffect } from 'react';
import { FiFile, FiFolderPlus, FiFolderMinus } from 'react-icons/fi';
import { useFileTree } from '@/providers/file-tree';
import { IGNORE_LIST } from '@/uitls/files';

export interface EditorFilesTreeProps {
    onSelectPath: (path: string) => void;
}

interface TreeLeaf {
    id: string;
    name: string;
    children?: TreeLeaf[];
}

export default function EditorFilesTree({ onSelectPath }: EditorFilesTreeProps) {
    const { fileTree } = useFileTree();
    const treeRef = useRef<HTMLDivElement>(null);
    const [treeHeight, setTreeHeight] = useState(0);

    const treeData = useMemo<TreeLeaf[]>(() => {
        if (!fileTree) return [];
        return fileTreeToTreeLeaf(fileTree);
    }, [fileTree]);

    useEffect(() => {
        if (!treeRef.current) return;

        if (treeRef.current) {
            setTreeHeight(treeRef.current.clientHeight);
        }

        // listen to tree height change
        const observer = new ResizeObserver(() => {
            if (treeRef.current) {
                setTreeHeight(treeRef.current.clientHeight);
            }
        });
        observer.observe(treeRef.current!);

        return () => {
            observer.disconnect();
        }
    }, [treeData]);


    const handleSelect = (nodeApi: NodeApi[]) => {
        if (nodeApi.length > 0) {
            const node = nodeApi[nodeApi.length - 1];
            if (!node.isLeaf) return;
            const path = nodeApi[nodeApi.length - 1].id;
            onSelectPath(path);
        }
    }

    return (
        <div ref={treeRef} className='overflow-auto px-4 flex flex-col' style={{ minWidth: '272px' }}>
            <Tree
                openByDefault={false}
                rowClassName='my-2'
                width={'100%'}
                height={treeHeight}
                disableMultiSelection={true}
                disableDrag={true}
                disableDrop={true}
                data={treeData}
                className='flex-1 scrollbar-hide'
                onSelect={handleSelect}>
                {Node}
            </Tree>
        </div>
    );
}

function Node({ node, style, dragHandle }: NodeRendererProps<TreeLeaf>) {
    return (
        <div style={style} ref={dragHandle} onClick={() => node.toggle()}
            className={`overflow-hidden rounded ${node.isSelected ? 'bg-primary/10' : ''}`}>
            <div className={`flex flex-row items-center gap-1 ${node.isSelected ? 'text-foreground' : 'text-gray-400'} text-sm cursor-pointer hover:text-primary`}>
                {node.isLeaf ? <FiFile /> : (node.isOpen ? <FiFolderMinus /> : <FiFolderPlus />)}
                {node.data.name}
            </div>
        </div>
    );
}

function fileTreeToTreeLeaf(fileTree: FileSystemTree, currentPath = ''): TreeLeaf[] {
    const result: TreeLeaf[] = [];
    for (const [path, node] of Object.entries(fileTree)) {
        const id = currentPath + path;

        if (IGNORE_LIST.some(ignorePath => path.includes(ignorePath))) {
            continue;
        }

        if ('file' in node) {
            // 这是一个文件
            result.push({
                id,
                name: path
            });
        } else if ('directory' in node) {
            // 这是一个目录
            const children = fileTreeToTreeLeaf(node.directory, id + '/');
            result.push({
                id,
                name: path,
                children
            });
        }
    }

    return result;
}
