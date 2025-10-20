import { createContext, useContext } from "react";
import { useState } from "react";
import { FileSystemTree } from "@webcontainer/api";

export const FileTreeContext = createContext({
    fileTree: null as FileSystemTree | null,
    stagingFileTree: null as FileSystemTree | null,
    setFileTree: (fileTree: FileSystemTree) => { },
    setStagingFileTree: (stagingFileTree: FileSystemTree) => { },
    handleSaveFileTree: () => { },
    handleDiscardFileTree: () => { },
});

export const FileTreeProvider = ({ children }: { children: React.ReactNode }) => {
    const [fileTree, setFileTree] = useState<FileSystemTree | null>(null);
    const [stagingFileTree, setStagingFileTree] = useState<FileSystemTree | null>(null);

    
    const handleSaveFileTree = () => {
        setFileTree(stagingFileTree);
        setStagingFileTree(null);
    }

    const handleDiscardFileTree = () => {
        setStagingFileTree(fileTree);
    }

    return <FileTreeContext.Provider
        value={{
            fileTree,
            setFileTree,
            stagingFileTree,
            setStagingFileTree,
            handleSaveFileTree,
            handleDiscardFileTree
        }}>
        {children}
    </FileTreeContext.Provider>;
};

export const useFileTree = () => {
    return useContext(FileTreeContext);
};