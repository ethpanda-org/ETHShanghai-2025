import { useState, useEffect, useRef } from 'react';
import { emitter } from '../event_bus/emitter';

interface PreviewProps {
  previewUrl: string;
}

export function Preview({ previewUrl }: PreviewProps) {
    const [url, setUrl] = useState(previewUrl);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    const handleRefresh = () => {
        if (iframeRef.current) {
            iframeRef.current.src = url;
        }
    }

    const handlePreviewPathChange = (path: string) => {
      if (iframeRef.current) {
        iframeRef.current.src = `${url}${path}`;
      }
    }

    useEffect(() => {
        emitter.on('refreshApp', handleRefresh);
        emitter.on('previewPathChange', handlePreviewPathChange);

        return () => {
            emitter.off('refreshApp', handleRefresh);
            emitter.off('previewPathChange', handlePreviewPathChange);
        }
    }, []);

    useEffect(() => {
        setUrl(previewUrl);
    }, [previewUrl]);

    return (
      <iframe ref={iframeRef} src={url} className={`w-full h-full`} />
    );
}