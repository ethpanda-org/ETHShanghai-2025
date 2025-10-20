// import React from 'react';

const CustomLayout = () => {
    return (
        <div className="min-h-screen bg-gradient-to-r from-purple-400 to-pink-400 text-white">
            {/* Side Navigation */}
            <div className="flex flex-col items-start w-1/5 bg-black p-6 space-y-8">
                <div className="text-3xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-blue-500">
                    TermiX
                </div>
                <nav className="mt-8 space-y-4">
                    <ul className="text-gray-300">
                        <li><a href="#" className="hover:text-white">New Chat</a></li>
                        <li><a href="#" className="hover:text-white">Chat History</a></li>
                        <li><a href="#" className="hover:text-white">MCP HUB</a></li>
                        <li><a href="#" className="hover:text-white">Achievements</a></li>
                    </ul>
                </nav>
            </div>

            {/* Main Content */}
            <div className="flex flex-col items-center w-4/5 p-8">
                <header className="flex justify-between w-full mb-10">
                    <div className="text-3xl font-semibold">New Chat</div>
                    <div className="text-sm text-gray-400">Your AI Web3 OS</div>
                </header>

                {/* Main Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 w-full">
                    {/* Card 1 */}
                    <div className="bg-gradient-to-r from-purple-500 to-blue-500 p-6 rounded-xl text-center shadow-lg hover:shadow-2xl transition-all">
                        <p className="text-xl font-semibold">Binance Life</p>
                        <p className="text-gray-200 mt-2">Get and share your Binance life card</p>
                    </div>

                    {/* Card 2 */}
                    <div className="bg-gradient-to-r from-yellow-500 to-orange-500 p-6 rounded-xl text-center shadow-lg hover:shadow-2xl transition-all">
                        <p className="text-xl font-semibold">Security Check</p>
                        <p className="text-gray-200 mt-2">Run an in-depth audit of any token contract</p>
                    </div>

                    {/* Card 3 */}
                    <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 rounded-xl text-center shadow-lg hover:shadow-2xl transition-all">
                        <p className="text-xl font-semibold">On Chain Data</p>
                        <p className="text-gray-200 mt-2">Quickly discover meme tokens on BNBChain</p>
                    </div>

                    {/* Card 4 */}
                    <div className="bg-gradient-to-r from-pink-500 to-red-600 p-6 rounded-xl text-center shadow-lg hover:shadow-2xl transition-all">
                        <p className="text-xl font-semibold">Perp Signal</p>
                        <p className="text-gray-200 mt-2">Analyze perp market data and get AI-powered trade setups</p>
                    </div>
                </div>

                {/* Refresh Button */}
                <button className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-4 rounded-full mt-8 w-full font-semibold hover:bg-opacity-80 transition-all">
                    Refresh
                </button>

                {/* Bottom Section */}
                <footer className="flex justify-between items-center w-full mt-12 text-gray-400 text-sm">
                    <div className="flex items-center">
                        <p>0.0000 BNB</p>
                        <button className="ml-4 bg-purple-500 text-white px-4 py-2 rounded-full text-sm hover:bg-purple-600 transition">Recharge</button>
                    </div>
                    <div className="flex items-center">
                        <p className="mr-2">TX Credit</p>
                        <div className="bg-gray-700 w-40 h-2 rounded-full">
                            <div className="bg-green-500 w-2/3 h-full rounded-full"></div>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default CustomLayout;
