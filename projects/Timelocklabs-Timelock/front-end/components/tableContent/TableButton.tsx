
type ColorType = 'blue' | 'green' | 'red' | 'gray' | 'yellow' | 'default';

export default function TableButton({ label, onClick, colorType }: { label: string, onClick: () => void, colorType?: ColorType }) {
    const getColor = () => {
        switch (colorType) {
            case 'blue':
                return 'from-blue-50 to-blue-100 text-blue-700 border-blue-200';
            case 'green':
                return 'from-green-50 to-green-100 text-green-700 border-green-200';
            case 'red':
                return 'from-red-50 to-red-100 text-red-700 border-red-200';
            case 'gray':
                return 'from-gray-50 to-gray-100 text-gray-700 border-gray-200';
            case 'yellow':
                return 'from-yellow-50 to-yellow-100 text-yellow-700 border-yellow-200';
            default:
                return 'from-gray-50 to-gray-100 text-gray-700 border-gray-200';
        }
    };
    return (
        <div className={`px-3 py-1.5 inline-flex items-center text-xs font-medium rounded-lg transition-all duration-200 hover:scale-105 bg-gradient-to-r  border  cursor-pointer ${getColor()}`} onClick={onClick}>
            {label}
        </div>

    );
}