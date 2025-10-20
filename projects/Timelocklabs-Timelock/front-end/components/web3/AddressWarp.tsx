'use client';
import { ethers } from "ethers";
import { formatAddress } from "@/utils/utils";

export default function AddressWarp({ address, className,isShort }: { address: string|undefined, className?: string ,isShort?: boolean}) {
    return (
        <div className={`${className}`}>{isShort ? formatAddress(address || '') : ethers.utils.getAddress(address || '')}</div>
    )
}