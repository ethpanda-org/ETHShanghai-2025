
//McpHub
import {SetStateAction, useState} from "react";

export default function McpHub() {
    const data = [
        {
            name: "Aster",
            introduce: "Aster是一个去中心化平台，质押代币到我们平台你可以放心",
            logo: "https://app.termix.ai/_next/image?url=https%3A%2F%2Ftermixai.s3.ap-southeast-1.amazonaws.com%2Fmcp_icon%2Faster_mcp.svg&w=48&q=75&dpl=dpl_F9BT1ZQtfFTVMbREaz5fhXf13eu7",
            annualized: "5%"
        },
        {
            name: "Aster",
            introduce: "Aster是一个去中心化平台，质押代币到我们平台你可以放心",
            logo: "https://app.termix.ai/_next/image?url=https%3A%2F%2Ftermixai.s3.ap-southeast-1.amazonaws.com%2Fmcp_icon%2Faster_mcp.svg&w=48&q=75&dpl=dpl_F9BT1ZQtfFTVMbREaz5fhXf13eu7",
            annualized: "5%"
        },
        {
            name: "Aster",
            introduce: "Aster是一个去中心化平台，质押代币到我们平台你可以放心",
            logo: "https://app.termix.ai/_next/image?url=https%3A%2F%2Ftermixai.s3.ap-southeast-1.amazonaws.com%2Fmcp_icon%2Faster_mcp.svg&w=48&q=75&dpl=dpl_F9BT1ZQtfFTVMbREaz5fhXf13eu7",
            annualized: "5%"
        },
        {
            name: "Aster",
            introduce: "Aster是一个去中心化平台，质押代币到我们平台你可以放心",
            logo: "https://app.termix.ai/_next/image?url=https%3A%2F%2Ftermixai.s3.ap-southeast-1.amazonaws.com%2Fmcp_icon%2Faster_mcp.svg&w=48&q=75&dpl=dpl_F9BT1ZQtfFTVMbREaz5fhXf13eu7",
            annualized: "5%"
        },
        {
            name: "Aster",
            introduce: "Aster是一个去中心化平台，质押代币到我们平台你可以放心",
            logo: "https://app.termix.ai/_next/image?url=https%3A%2F%2Ftermixai.s3.ap-southeast-1.amazonaws.com%2Fmcp_icon%2Faster_mcp.svg&w=48&q=75&dpl=dpl_F9BT1ZQtfFTVMbREaz5fhXf13eu7",
            annualized: "5%"
        },
        {
            name: "Aster",
            introduce: "Aster是一个去中心化平台，质押代币到我们平台你可以放心",
            logo: "https://app.termix.ai/_next/image?url=https%3A%2F%2Ftermixai.s3.ap-southeast-1.amazonaws.com%2Fmcp_icon%2Faster_mcp.svg&w=48&q=75&dpl=dpl_F9BT1ZQtfFTVMbREaz5fhXf13eu7",
            annualized: "5%"
        },
        {
            name: "Aster",
            introduce: "Aster是一个去中心化平台，质押代币到我们平台你可以放心",
            logo: "https://app.termix.ai/_next/image?url=https%3A%2F%2Ftermixai.s3.ap-southeast-1.amazonaws.com%2Fmcp_icon%2Faster_mcp.svg&w=48&q=75&dpl=dpl_F9BT1ZQtfFTVMbREaz5fhXf13eu7",
            annualized: "5%"
        },
        {
            name: "Aster",
            introduce: "Aster是一个去中心化平台，质押代币到我们平台你可以放心",
            logo: "https://app.termix.ai/_next/image?url=https%3A%2F%2Ftermixai.s3.ap-southeast-1.amazonaws.com%2Fmcp_icon%2Faster_mcp.svg&w=48&q=75&dpl=dpl_F9BT1ZQtfFTVMbREaz5fhXf13eu7",
            annualized: "5%"
        },
        {
            name: "Aster",
            introduce: "Aster是一个去中心化平台，质押代币到我们平台你可以放心",
            logo: "https://app.termix.ai/_next/image?url=https%3A%2F%2Ftermixai.s3.ap-southeast-1.amazonaws.com%2Fmcp_icon%2Faster_mcp.svg&w=48&q=75&dpl=dpl_F9BT1ZQtfFTVMbREaz5fhXf13eu7",
            annualized: "5%"
        },
    ]
    const [searchQuery, setSearchQuery] = useState('');

    const handleChange = (e: { target: { value: SetStateAction<string>; }; }) => {
        setSearchQuery(e.target.value);
        handleSearch()
    };

    const handleSearch = () => {
        // 在这里可以执行搜索操作
        console.log("Searching for:", searchQuery);
    };
    return (
        <div className="h-full overflow-auto">
            <div className="h-72 w-full rounded-xl border-2 border-red-600">

            </div>
            <div className="w-full">
                <div className="py-4 pl-2 flex justify-between">

                    <h2 className="font-bold text-xl">All Defi</h2>
                    <div className="">
                        <div className="flex items-center">
                            {/* 搜索框 */}
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={handleChange}
                                placeholder="Search Defi..."
                                className="text-white bg-transparent border-2 border-[rgb(182,253,247)] px-4 py-2 rounded-full
          focus:outline-none focus:border-blue-500 placeholder:text-gray-400"
                            />

                            {/* 搜索按钮 */}

                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-2">
                    {data.map((item, index) => (
                        <div key={index}
                             className="h-full py-[18px] px-4 space-y-3 border-[1px] border-[#2D2D2D] bg-[#0F0F0F] rounded-xl flex-1 cursor-pointer transition-shadow duration-300 [&:not(:has(button:hover))]:hover:shadow-[0px_0px_15px_0px_rgba(170,245,53,0.23)]">
                            <div className="flex items-center space-x-4">
                                <img src={item.logo} alt={item.name} className="w-12 h-12"/>
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <h3 className="font-semibold text-base whitespace-nowrap leading-4 tracking-tight ">{item.name}</h3>
                                        <span className="text-red-600 text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-red-400">{item.annualized}</span>
                                    </div>
                                    <p className="text-sm text-[#7B838A] line-clamp-2 leading-5">{item.introduce}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

            </div>
        </div>
    )
}
