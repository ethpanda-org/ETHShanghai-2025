'use client'
import { OAuthHandler } from '@instantdb/platform';
import { useEffect } from 'react';

export default function InstantRedirect() {
    useEffect(() => {
        if (window) {
            const oauthHandler = new OAuthHandler({
                clientId: process.env.NEXT_PUBLIC_INSTANTDB_OAUTH_CLIENT_ID!,
                redirectUri: `${window.location.origin}/oauth/instant/redirect`,
            });
            return oauthHandler.handleClientRedirect();
        }
    }, [])

    return null
}