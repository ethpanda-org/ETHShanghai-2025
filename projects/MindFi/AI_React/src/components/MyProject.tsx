
import {useUserStore} from "@/stores/userStore.ts";
import {hiddenMiddle} from "@/utils/addressUtils.ts";

//McpHub
import {Progress, ProgressProps} from "antd";
import {useState} from "react";

export default function McpHub() {
    const [data, setData] = useState([])
    const [recommendData, setRecommendData] = useState([
        {
            name: "Aster",
            introduce: "Aster is a decentralized platform. You can be assured of staking your tokens on our platform.",
            logo: "https://app.termix.ai/_next/image?url=https%3A%2F%2Ftermixai.s3.ap-southeast-1.amazonaws.com%2Fmcp_icon%2Faster_mcp.svg&w=48&q=75&dpl=dpl_F9BT1ZQtfFTVMbREaz5fhXf13eu7",
            annualized: "5%"
        },
        {
            name: "Aster",
            introduce: "Aster is a decentralized platform. You can be assured of staking your tokens on our platform.",
            logo: "https://app.termix.ai/_next/image?url=https%3A%2F%2Ftermixai.s3.ap-southeast-1.amazonaws.com%2Fmcp_icon%2Faster_mcp.svg&w=48&q=75&dpl=dpl_F9BT1ZQtfFTVMbREaz5fhXf13eu7",
            annualized: "5%"
        },
        {
            name: "Aster",
            introduce: "Aster is a decentralized platform. You can be assured of staking your tokens on our platform.",
            logo: "https://app.termix.ai/_next/image?url=https%3A%2F%2Ftermixai.s3.ap-southeast-1.amazonaws.com%2Fmcp_icon%2Faster_mcp.svg&w=48&q=75&dpl=dpl_F9BT1ZQtfFTVMbREaz5fhXf13eu7",
            annualized: "5%"
        },
        {
            name: "Aster",
            introduce: "Aster is a decentralized platform. You can be assured of staking your tokens on our platform.",
            logo: "https://app.termix.ai/_next/image?url=https%3A%2F%2Ftermixai.s3.ap-southeast-1.amazonaws.com%2Fmcp_icon%2Faster_mcp.svg&w=48&q=75&dpl=dpl_F9BT1ZQtfFTVMbREaz5fhXf13eu7",
            annualized: "5%"
        },
    ])


    const personal = {
        logo: "https://app.termix.ai/_next/image?url=https%3A%2F%2Ftermixai.s3.ap-southeast-1.amazonaws.com%2Fmcp_icon%2Faster_mcp.svg&w=48&q=75&dpl=dpl_F9BT1ZQtfFTVMbREaz5fhXf13eu7",
        address: "0x....4252",
        name: "user",
        amount: 0.1,
        profit: 0.001,
        number: 5,
        avgAnnualized: 5
    }
    // 使用zustand来获取和设置用户信息
    const {
        avatar_url, alias, address, amount, profit, number, avgAnnualized,
    } = useUserStore();


    const twoColors: ProgressProps['strokeColor'] = {
        '0%': '#108ee9',
        '100%': '#87d068',
    };

    const conicColors: ProgressProps['strokeColor'] = {
        '0%': '#1e3a8a',
        '50%': '#4f46e5',
        '100%': '#9333ea',
    };
    return (
        <div className="h-full overflow-auto">
            <div className="h-72 w-full rounded-xl overflow-hidden flex">
                <div className="personal w-80 h-full p-4 rounded-xl bg-gradient-to-br from-blue-800 via-indigo-600 to-purple-500 text-white flex flex-col justify-between">
                    <div className="header flex">
                        <div className="logo  w-24 h-24 rounded-full border">
                            <img className="w-full h-full rounded-full" src={avatar_url} />

                        </div>
                        <div className="personal ml-6">
                            <h4 className="text-2xl my-2 font-bold">{alias}</h4>
                            <h4>{hiddenMiddle(address as string)}</h4>
                        </div>
                    </div>

                    <div className=" flex flex-col flex-grow mt-4 justify-around">
                        <Progress
                            percent={number * 10}
                            strokeColor={twoColors}
                            style={{color: "white"}}
                            size={[300, 20]}
                            format={(percent) => <span
                                style={{color: '#fff'}}>{`${percent as number / 10} `}</span>}
                        />
                        <Progress
                            percent={amount * 100}
                            strokeColor={twoColors}
                            style={{color: "white"}}
                            size={[300, 20]}
                            format={(percent) => <span
                                style={{color: '#FFF'}}>{`${percent as number / 100}`}</span>}
                        />
                        <Progress
                            percent={profit * 10000}
                            strokeColor={twoColors}
                            style={{color: "white"}}
                            size={[300, 20]}
                            format={(percent) => <span
                                style={{color: '#FFF'}}>{`${percent as number / 10000}`}</span>}
                        />
                        <Progress
                            percent={avgAnnualized }
                            strokeColor={twoColors}
                            style={{color: "white"}}
                            size={[300, 20]}
                            format={(percent) => <span
                                style={{color: '#FFF'}}>{`${percent as number} %`}</span>}
                        />
                    </div>


                </div>
                <div className="flex-grow h-full border-2 border-red-600 rounded-xl"></div>
            </div>
            <div className="w-full">
                <div className="py-4 pl-2  flex justify-between">
                    <h2 className="font-bold text-xl">MY DEFI</h2>

                </div>
                {data.length > 0 ?
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-2">
                        {data.map((item, index) => (
                            <div key={index}
                                 className="h-full py-[18px] px-4 space-y-3 border-[1px] border-[#2D2D2D] bg-[#0F0F0F] rounded-xl flex-1 cursor-pointer transition-shadow duration-300 [&:not(:has(button:hover))]:hover:shadow-[0px_0px_15px_0px_rgba(170,245,53,0.23)]">
                                <div className="flex items-center space-x-4">
                                    <img src={item.logo} alt={item.name} className="w-12 h-12"/>
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <h3 className="font-semibold text-base whitespace-nowrap leading-4 tracking-tight ">{item.name}</h3>
                                            <span
                                                className="text-red-600 text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-red-400">{item.annualized}</span>
                                        </div>
                                        <p className="text-sm text-[#7B838A] line-clamp-2 leading-5">{item.introduce}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    :
                    <div
                        className="flex flex-col items-center justify-center h-[500px] text-white p-8 space-y-6">
                        {/* 标题部分 */}
                        <h1 className="text-5xl h-14 font-semibold text-transparent bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text">
                            Make money automatically now
                        </h1>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 p-6">
                            {recommendData.map((item, index) => (
                                <div className="overflow-hidden rounded-xl cursor-pointer
                                    [&:not(:has(button:hover))]:hover:shadow-[0px_0px_15px_0px_rgba(170,245,53,0.23)]
                                     transition-all duration-300"
                                     key={index}>
                                    <div
                                        className="rounded-xl overflow-hidden border-2 border-purple-600 p-4">
                                        <div className="space-y-3 mb-4 h-28 w-56">
                                            <div className="flex items-center ">
                                                <img src={item.logo} alt={item.name}
                                                     className="w-8 h-8 rounded-full border-2 border-white"/>
                                                <h3 className="ml-3 text-xl font-semibold text-white">{item.name}</h3>
                                            </div>
                                            <p className="text-sm text-gray-200">{item.introduce}</p>
                                        </div>
                                        <div className="text-lg font-bold text-white">{item.annualized} Annualized</div>
                                    </div>
                                </div>

                            ))}
                        </div>

                        {/* 按钮部分 */}
                        <button
                            className="px-6 py-2 text-lg font-bold text-white bg-gradient-to-br from-blue-800 via-indigo-600 to-purple-500 rounded-full hover:scale-105 transition-transform duration-300">
                            + Add Defi
                        </button>
                    </div>
                    // <div className="h-96 w-full flex flex-col justify-center items-center">
                    //     <div className="p-4 text-6xl bg-gradient-to-br from-blue-800 via-indigo-600 to-purple-500 text-transparent bg-clip-text">Make money automatically now</div>
                    //     <div className="text-white border-2 border-[rgb(182,253,247)] px-4 py-2 rounded-full
                    // hover:bg-[rgb(182,253,247)] hover:text-red-300 cursor-pointer font-bold
                    // ">
                    //         + Add Defi
                    //     </div>
                    // </div>


                }

            </div>
        </div>
    )
}
