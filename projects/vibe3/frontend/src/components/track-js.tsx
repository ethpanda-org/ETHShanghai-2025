"use client"

import { TrackJS as TrackJSInstance } from "trackjs";
import { useEffect } from "react";


export function TrackJS() {
    useEffect(() => {
        if (typeof window !== "undefined") {
            if (!TrackJSInstance.isInstalled()) {
                TrackJSInstance.install({
                    token: process.env.NEXT_PUBLIC_TRACKJS_TOKEN!,
                    application: "vibe3-app",
                    enabled: process.env.NODE_ENV === "production",
                });
            }
        }
    }, []);

    return null;
}