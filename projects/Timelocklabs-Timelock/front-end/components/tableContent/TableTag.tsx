import React from 'react';
import capitalizeFirstLetter from "@/utils/capitalizeFirstLetter";

type ColorType = 'blue' | 'green' | 'red' | 'gray' | 'yellow' | 'default';
type StatusType = 'waiting' | 'ready' | 'cancelled' | 'expired' | 'executed';

export default function TableTag({ label, colorType, statusType, Icon }: { label: string | undefined, colorType?: ColorType, statusType?: StatusType, Icon?: React.ReactNode }) {

    const getHistoryTxTypeStyle = () => {
        if (colorType) {
            switch (colorType) {
                case 'blue':
                    return 'bg-blue-100 text-blue-800 border border-blue-200';
                case 'green':
                    return 'bg-green-100 text-green-800 border border-green-200';
                case 'red':
                    return 'bg-red-100 text-red-800 border border-red-200';
                case 'gray':
                    return 'bg-gray-100 text-gray-800 border border-gray-200';
                case 'yellow':
                    return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
                default:
                    return 'bg-gray-100 text-gray-800 border border-gray-200';
            }
        }
        if (statusType) {
            switch (statusType) {
                case 'waiting':
                    return 'bg-blue-100 text-blue-800 border border-blue-200';
                case 'ready':
                    return 'bg-green-100 text-green-800 border border-green-200';
                case 'cancelled':
                    return 'bg-red-100 text-red-800 border border-red-200';
                case 'expired':
                    return 'bg-gray-100 text-gray-800 border border-gray-200';
                case 'executed':
                    return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
                default:
                    return 'bg-gray-100 text-gray-800 border border-gray-200';
            }
        }
        // Default fallback when neither colorType nor statusType is provided
        return 'bg-gray-100 text-gray-800 border border-gray-200';
    };

    return <div className={`flex justify-center items-center px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getHistoryTxTypeStyle()}`}>
        {Icon && Icon}
        <div className="ml-[3px]">{capitalizeFirstLetter(label || '')}</div>
    </div>
}