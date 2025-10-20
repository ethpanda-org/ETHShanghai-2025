import initData from './utils/initData'
import { generateOrderData } from './utils/generateOrderData'
const scope = getNameForTag(__dirname, __filename)
const theDebug = require('debug')(scope)
describe(scope, () => {
    let marketId = ''
    before(async () => {
        const rz = await initData()
        marketId = randomId()
    });

    const checkRz = async (takerOrder, makerOrders) => {
        theDebug(`takerOrder: ${takerOrder.salt}`)
        for (let i = 0; i < makerOrders.length; i++) {
            theDebug(`maker ${i} : ${makerOrders[i].salt}`)
        }

        const orderMatcherUserAddress = (await getSignerByKey('orderMatcher1')).address
        const diamondAddress = await getContractAddress('PredMoonApp')

        const facetAdmin = await getFacetWithSignerKey('PredMoonApp', 'AdminFacet', 'orderMatcher1')
        const facetOrderMatcher = await getFacetWithSignerKey('PredMoonApp', 'OrderMatcherFacet', 'orderMatcher1')
        const facetERC1155 = await getFacetWithSignerKey('PredMoonApp', 'ERC1155Facet', 'orderMatcher1')
        const oldBalance = await facetERC1155.balanceOf(takerOrder.maker, takerOrder.tokenId)

        const tx = await facetOrderMatcher.matchOrder(takerOrder, makerOrders, getConfig('TradeType').merge)

        const StableCoinContract = await getContractWithSignerKey('USDTMock', 'deployer')

        // 把 taker 的 usdc 转给交易所
        await expect(tx).to.emit(StableCoinContract, "Transfer").withArgs(diamondAddress, takerOrder.maker, takerOrder.paymentTokenAmount)
        // 检查 Taker 钱包中是否此时有了对应数量的 NFT
        const newBalance = await facetERC1155.balanceOf(takerOrder.maker, takerOrder.tokenId)
        expect(newBalance).to.be.equal(oldBalance.sub(takerOrder.exchangeNftAmount))

        let takerShouldBurnAmount = parseUnits('0', 1);

        for (let i = 0; i < makerOrders.length; i++) {
            if (makerOrders[i].side == 0) {
                // maker 买入
                await expect(tx).to.emit(StableCoinContract, "Transfer").withArgs(makerOrders[i].maker, diamondAddress, makerOrders[i].paymentTokenAmount);
                await expect(tx).to.emit(facetERC1155, 'TransferSingle').withArgs(orderMatcherUserAddress, takerOrder.maker, makerOrders[i].maker, makerOrders[i].tokenId, makerOrders[i].exchangeNftAmount)
            } else {
                takerShouldBurnAmount = takerShouldBurnAmount.add(makerOrders[i].exchangeNftAmount)
                await expect(tx).to.emit(StableCoinContract, "Transfer").withArgs(diamondAddress, makerOrders[i].maker, makerOrders[i].paymentTokenAmount);
                await expect(tx).to.emit(facetERC1155, 'TransferSingle').withArgs(orderMatcherUserAddress, makerOrders[i].maker, ethers.constants.AddressZero, makerOrders[i].tokenId, makerOrders[i].exchangeNftAmount)
            }
        }
        const onChainRemaining = await facetAdmin.getRemainingAmount(takerOrder)
        const offChainRemaining = takerOrder.tokenAmount - takerOrder.exchangeNftAmount
        expect(onChainRemaining).to.be.equal(offChainRemaining)

        await expect(tx).to.emit(facetERC1155, 'TransferSingle').withArgs(orderMatcherUserAddress, takerOrder.maker, ethers.constants.AddressZero, takerOrder.tokenId, takerShouldBurnAmount)
    }

    step(`taker Sell A 0.7 * 100, maker1 sell A' 0.3 * 100`, async () => {
        const feeTokenAddress = await getContractAddress('USDTMock')
        const StableCoinAddress = await getContractAddress('USDTMock')
        const turingTokenAddress = await getContractAddress('TuringToken')

        const users = await getUnnamedAccounts();

        const makerOrders = [
            await generateOrderData({
                maker: users[1],
                tokenId: 2,
                tokenAmount: '100',
                tokenPriceInPaymentToken: '0.3', // in usdc
                paymentTokenAddress: StableCoinAddress,
                slippageBps: 0,
                deadlineDelta: 1 * (60 * 60 * 24), // delta: 1 day
                side: 1,
                feeTokenAddress,
            }, {
                fee1RateBps: 900,
                fee1TokenAddress: StableCoinAddress,
                fee2RateBps: 100,
                fee2TokenAddress: turingTokenAddress,
            }),
        ];

        let takerPaymentTokenAmount = 0n;
        for (let i = 0; i < makerOrders.length; i++) {
            takerPaymentTokenAmount = makerOrders[i].nftPairPaymentAmount.add(takerPaymentTokenAmount)
        }
        const takerOrder = await generateOrderData({
            maker: users[0],
            tokenId: 1,
            tokenAmount: '100',
            tokenPriceInPaymentToken: '0.7', // in usdc
            paymentTokenAddress: StableCoinAddress,
            slippageBps: 0,
            deadlineDelta: 1 * (60 * 60 * 24), // delta: 1 day
            side: 1,
            feeTokenAddress,
        }, {
            takerPaymentTokenAmount,
            fee1RateBps: 900,
            fee1TokenAddress: StableCoinAddress,
            fee2RateBps: 100,
            fee2TokenAddress: turingTokenAddress,
        })

        await checkRz(takerOrder, makerOrders);
    })

    step(`taker Sell 0.7 * 100, maker1 Sell 0.3 * 50, maker2 Buy 0.7 * 50`, async () => {
        const feeTokenAddress = await getContractAddress('USDTMock')
        const StableCoinAddress = await getContractAddress('USDTMock')
        const turingTokenAddress = await getContractAddress('TuringToken')

        const users = await getUnnamedAccounts();

        const makerOrders = [
            await generateOrderData({
                maker: users[1],
                tokenId: 2,
                tokenAmount: '50',
                tokenPriceInPaymentToken: '0.3', // in usdc
                paymentTokenAddress: StableCoinAddress,
                slippageBps: 0,
                deadlineDelta: 1 * (60 * 60 * 24), // delta: 1 day
                side: 1,
                feeTokenAddress,
            }, {
                fee1RateBps: 900,
                fee1TokenAddress: StableCoinAddress,
                fee2RateBps: 100,
                fee2TokenAddress: turingTokenAddress,
            }),
            await generateOrderData({
                maker: users[1],
                tokenId: 1,
                tokenAmount: '50',
                tokenPriceInPaymentToken: '0.7', // in usdc
                paymentTokenAddress: StableCoinAddress,
                slippageBps: 0,
                deadlineDelta: 1 * (60 * 60 * 24), // delta: 1 day
                side: 0,
                feeTokenAddress,
            }, {
                fee1RateBps: 900,
                fee1TokenAddress: StableCoinAddress,
                fee2RateBps: 100,
                fee2TokenAddress: turingTokenAddress,
            }),
        ];

        let takerPaymentTokenAmount = 0n;
        for (let i = 0; i < makerOrders.length; i++) {
            if (makerOrders[i].side == 0) {
                takerPaymentTokenAmount = makerOrders[i].paymentTokenAmount.add(takerPaymentTokenAmount)
            } else {
                takerPaymentTokenAmount = makerOrders[i].nftPairPaymentAmount.add(takerPaymentTokenAmount)
            }
        }

        const takerOrder = await generateOrderData({
            maker: users[0],
            tokenId: 1,
            tokenAmount: '100',
            tokenPriceInPaymentToken: '0.7', // in usdc
            paymentTokenAddress: StableCoinAddress,
            slippageBps: 0,
            deadlineDelta: 1 * (60 * 60 * 24), // delta: 1 day
            side: 1,
            feeTokenAddress,
        }, {
            takerPaymentTokenAmount,
            fee1RateBps: 900,
            fee1TokenAddress: StableCoinAddress,
            fee2RateBps: 100,
            fee2TokenAddress: turingTokenAddress,
        })

        await checkRz(takerOrder, makerOrders);
    })

    step(`taker Sell 0.7 * 100, maker1 Sell 0.3 * 50, maker2 Buy 0.7 * 100 (tradedBps=5000)`, async () => {
        const feeTokenAddress = await getContractAddress('USDTMock')
        const StableCoinAddress = await getContractAddress('USDTMock')
        const turingTokenAddress = await getContractAddress('TuringToken')

        const users = await getUnnamedAccounts();

        const makerOrders = [
            await generateOrderData({
                maker: users[1],
                tokenId: 2,
                tokenAmount: '50',
                tokenPriceInPaymentToken: '0.3', // in usdc
                paymentTokenAddress: StableCoinAddress,
                slippageBps: 0,
                deadlineDelta: 1 * (60 * 60 * 24), // delta: 1 day
                side: 1,
                feeTokenAddress,
            }, {
                fee1RateBps: 900,
                fee1TokenAddress: StableCoinAddress,
                fee2RateBps: 100,
                fee2TokenAddress: turingTokenAddress,
            }),
            await generateOrderData({
                maker: users[1],
                tokenId: 1,
                tokenAmount: '100',
                tokenPriceInPaymentToken: '0.7', // in usdc
                paymentTokenAddress: StableCoinAddress,
                slippageBps: 0,
                deadlineDelta: 1 * (60 * 60 * 24), // delta: 1 day
                side: 0,
                feeTokenAddress,
            }, {
                tradedBps: 5000,
                fee1RateBps: 900,
                fee1TokenAddress: StableCoinAddress,
                fee2RateBps: 100,
                fee2TokenAddress: turingTokenAddress,
            }),
        ];

        let takerPaymentTokenAmount = 0n;
        for (let i = 0; i < makerOrders.length; i++) {
            if (makerOrders[i].side == 0) {
                takerPaymentTokenAmount = makerOrders[i].paymentTokenAmount.add(takerPaymentTokenAmount)
            } else {
                takerPaymentTokenAmount = makerOrders[i].nftPairPaymentAmount.add(takerPaymentTokenAmount)
            }
        }

        const takerOrder = await generateOrderData({
            maker: users[0],
            tokenId: 1,
            tokenAmount: '100',
            tokenPriceInPaymentToken: '0.7', // in usdc
            paymentTokenAddress: StableCoinAddress,
            slippageBps: 0,
            deadlineDelta: 1 * (60 * 60 * 24), // delta: 1 day
            side: 1,
            feeTokenAddress,
        }, {
            takerPaymentTokenAmount,
            fee1RateBps: 900,
            fee1TokenAddress: StableCoinAddress,
            fee2RateBps: 100,
            fee2TokenAddress: turingTokenAddress,
        })

        await checkRz(takerOrder, makerOrders);
    })

    step(`taker Sell 0.7 * 100(tradedBps=6000), maker1 Sell 0.3 * 50, maker2 Buy 0.7 * 10`, async () => {
        const feeTokenAddress = await getContractAddress('USDTMock')
        const StableCoinAddress = await getContractAddress('USDTMock')
        const turingTokenAddress = await getContractAddress('TuringToken')

        const users = await getUnnamedAccounts();

        const makerOrders = [
            await generateOrderData({
                maker: users[1],
                tokenId: 2,
                tokenAmount: '50',
                tokenPriceInPaymentToken: '0.3', // in usdc
                paymentTokenAddress: StableCoinAddress,
                slippageBps: 0,
                deadlineDelta: 1 * (60 * 60 * 24), // delta: 1 day
                side: 1,
                feeTokenAddress,
            }, {
                fee1RateBps: 900,
                fee1TokenAddress: StableCoinAddress,
                fee2RateBps: 100,
                fee2TokenAddress: turingTokenAddress,
            }),
            await generateOrderData({
                maker: users[1],
                tokenId: 1,
                tokenAmount: '10',
                tokenPriceInPaymentToken: '0.7', // in usdc
                paymentTokenAddress: StableCoinAddress,
                slippageBps: 0,
                deadlineDelta: 1 * (60 * 60 * 24), // delta: 1 day
                side: 0,
                feeTokenAddress,
            }, {
                fee1RateBps: 900,
                fee1TokenAddress: StableCoinAddress,
                fee2RateBps: 100,
                fee2TokenAddress: turingTokenAddress,
            }),
        ];

        let takerPaymentTokenAmount = 0n;
        for (let i = 0; i < makerOrders.length; i++) {
            if (makerOrders[i].side == 0) {
                takerPaymentTokenAmount = makerOrders[i].paymentTokenAmount.add(takerPaymentTokenAmount)
            } else {
                takerPaymentTokenAmount = makerOrders[i].nftPairPaymentAmount.add(takerPaymentTokenAmount)
            }
        }

        const takerOrder = await generateOrderData({
            maker: users[0],
            tokenId: 1,
            tokenAmount: '100',
            tokenPriceInPaymentToken: '0.7', // in usdc
            paymentTokenAddress: StableCoinAddress,
            slippageBps: 0,
            deadlineDelta: 1 * (60 * 60 * 24), // delta: 1 day
            side: 1,
            feeTokenAddress,
        }, {
            tradedBps: 6000,
            takerPaymentTokenAmount,
            fee1RateBps: 900,
            fee1TokenAddress: StableCoinAddress,
            fee2RateBps: 100,
            fee2TokenAddress: turingTokenAddress,
        })

        await checkRz(takerOrder, makerOrders);
    })

    step(`taker Sell 0.7 * 100(tradedBps=8000), maker1 Sell 0.3 * 50, maker2 Sell 0.3 * 20, maker3 Buy 0.7 * 10`, async () => {
        const feeTokenAddress = await getContractAddress('USDTMock')
        const StableCoinAddress = await getContractAddress('USDTMock')
        const turingTokenAddress = await getContractAddress('TuringToken')

        const users = await getUnnamedAccounts();

        const makerOrders = [
            await generateOrderData({
                maker: users[1],
                tokenId: 2,
                tokenAmount: '50',
                tokenPriceInPaymentToken: '0.3', // in usdc
                paymentTokenAddress: StableCoinAddress,
                slippageBps: 0,
                deadlineDelta: 1 * (60 * 60 * 24), // delta: 1 day
                side: 1,
                feeTokenAddress,
            }, {
                fee1RateBps: 900,
                fee1TokenAddress: StableCoinAddress,
                fee2RateBps: 100,
                fee2TokenAddress: turingTokenAddress,
            }),
            await generateOrderData({
                maker: users[2],
                tokenId: 2,
                tokenAmount: '20',
                tokenPriceInPaymentToken: '0.3', // in usdc
                paymentTokenAddress: StableCoinAddress,
                slippageBps: 0,
                deadlineDelta: 1 * (60 * 60 * 24), // delta: 1 day
                side: 1,
                feeTokenAddress,
            }, {
                fee1RateBps: 900,
                fee1TokenAddress: StableCoinAddress,
                fee2RateBps: 100,
                fee2TokenAddress: turingTokenAddress,
            }),
            await generateOrderData({
                maker: users[1],
                tokenId: 1,
                tokenAmount: '10',
                tokenPriceInPaymentToken: '0.7', // in usdc
                paymentTokenAddress: StableCoinAddress,
                slippageBps: 0,
                deadlineDelta: 1 * (60 * 60 * 24), // delta: 1 day
                side: 0,
                feeTokenAddress,
            }, {
                fee1RateBps: 900,
                fee1TokenAddress: StableCoinAddress,
                fee2RateBps: 100,
                fee2TokenAddress: turingTokenAddress,
            }),
        ];

        let takerPaymentTokenAmount = 0n;
        for (let i = 0; i < makerOrders.length; i++) {
            if (makerOrders[i].side == 0) {
                takerPaymentTokenAmount = makerOrders[i].paymentTokenAmount.add(takerPaymentTokenAmount)
            } else {
                takerPaymentTokenAmount = makerOrders[i].nftPairPaymentAmount.add(takerPaymentTokenAmount)
            }
        }

        const takerOrder = await generateOrderData({
            maker: users[0],
            tokenId: 1,
            tokenAmount: '100',
            tokenPriceInPaymentToken: '0.7', // in usdc
            paymentTokenAddress: StableCoinAddress,
            slippageBps: 0,
            deadlineDelta: 1 * (60 * 60 * 24), // delta: 1 day
            side: 1,
            feeTokenAddress,
        }, {
            tradedBps: 8000,
            takerPaymentTokenAmount,
            fee1RateBps: 900,
            fee1TokenAddress: StableCoinAddress,
            fee2RateBps: 100,
            fee2TokenAddress: turingTokenAddress,
        })

        await checkRz(takerOrder, makerOrders);
    })
});