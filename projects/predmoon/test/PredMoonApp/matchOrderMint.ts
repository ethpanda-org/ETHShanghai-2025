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

        const tx = await facetOrderMatcher.matchOrder(takerOrder, makerOrders, getConfig('TradeType').mint)

        const StableCoinContract = await getContractWithSignerKey('USDTMock', 'deployer')

        await expect(tx).to.emit(StableCoinContract, "Transfer").withArgs(takerOrder.maker, diamondAddress, takerOrder.paymentTokenAmount)
        await expect(tx).to.emit(facetERC1155, 'TransferSingle').withArgs(orderMatcherUserAddress, ethers.constants.AddressZero, takerOrder.maker, takerOrder.tokenId, takerOrder.exchangeNftAmount)
        const newBalance = await facetERC1155.balanceOf(takerOrder.maker, takerOrder.tokenId)
        expect(newBalance).to.be.equal(oldBalance.add(takerOrder.exchangeNftAmount))
        for (let i = 0; i < makerOrders.length; i++) {
            theDebug(`maker ${i} : ${makerOrders[i].maker}`)
            await expect(tx).to.emit(StableCoinContract, "Transfer").withArgs(makerOrders[i].maker, diamondAddress, makerOrders[i].paymentTokenAmount);
            await expect(tx).to.emit(facetERC1155, 'TransferSingle').withArgs(orderMatcherUserAddress, ethers.constants.AddressZero, makerOrders[i].maker, makerOrders[i].tokenId, makerOrders[i].exchangeNftAmount)
        }

        const onChainRemaining = await facetAdmin.getRemainingAmount(takerOrder)
        const offChainRemaining = takerOrder.tokenAmount - takerOrder.exchangeNftAmount
        expect(onChainRemaining).to.be.equal(offChainRemaining)
    }

    step(`taker Buy A 0.5 * 100, maker1 buy A' 0.5 * 100`, async () => {
        const feeTokenAddress = await getContractAddress('USDTMock')
        const StableCoinAddress = await getContractAddress('USDTMock')
        const turingTokenAddress = await getContractAddress('TuringToken')

        const users = await getUnnamedAccounts();

        const makerOrders = [
            await generateOrderData({
                maker: users[1],
                tokenId: 2,
                tokenAmount: '100',
                tokenPriceInPaymentToken: '0.5', // in usdc
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
            takerPaymentTokenAmount = makerOrders[i].nftPairPaymentAmount.add(takerPaymentTokenAmount)
        }
        const takerOrder = await generateOrderData({
            maker: users[0],
            tokenId: 1,
            tokenAmount: '100',
            tokenPriceInPaymentToken: '0.5', // in usdc
            paymentTokenAddress: StableCoinAddress,
            slippageBps: 0,
            deadlineDelta: 1 * (60 * 60 * 24), // delta: 1 day
            side: 0,
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

    step(`taker Buy A 0.5 * 100(tradedBps:5000), maker1 buy A' 0.5 * 50`, async () => {
        const feeTokenAddress = await getContractAddress('USDTMock')
        const StableCoinAddress = await getContractAddress('USDTMock')
        const turingTokenAddress = await getContractAddress('TuringToken')

        const users = await getUnnamedAccounts();

        const makerOrders = [
            await generateOrderData({
                maker: users[1],
                tokenId: 2,
                tokenAmount: '50',
                tokenPriceInPaymentToken: '0.5', // in usdc
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
            takerPaymentTokenAmount = makerOrders[i].nftPairPaymentAmount.add(takerPaymentTokenAmount)
        }
        const takerOrder = await generateOrderData({
            maker: users[0],
            tokenId: 1,
            tokenAmount: '100',
            tokenPriceInPaymentToken: '0.5', // in usdc
            paymentTokenAddress: StableCoinAddress,
            slippageBps: 0,
            deadlineDelta: 1 * (60 * 60 * 24), // delta: 1 day
            side: 0,
            feeTokenAddress,
        }, {
            takerPaymentTokenAmount,
            tradedBps: 5000,
            fee1RateBps: 900,
            fee1TokenAddress: StableCoinAddress,
            fee2RateBps: 100,
            fee2TokenAddress: turingTokenAddress,
        })

        await checkRz(takerOrder, makerOrders);
    })

    step(`taker Buy A 0.8 * 100(tradedBps:9000), maker1 buy A' 0.2 * 90`, async () => {
        const feeTokenAddress = await getContractAddress('USDTMock')
        const StableCoinAddress = await getContractAddress('USDTMock')
        const turingTokenAddress = await getContractAddress('TuringToken')

        const users = await getUnnamedAccounts();

        const makerOrders = [
            await generateOrderData({
                maker: users[1],
                tokenId: 2,
                tokenAmount: '90',
                tokenPriceInPaymentToken: '0.2', // in usdc
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
            takerPaymentTokenAmount = makerOrders[i].nftPairPaymentAmount.add(takerPaymentTokenAmount)
        }
        const takerOrder = await generateOrderData({
            maker: users[0],
            tokenId: 1,
            tokenAmount: '100',
            tokenPriceInPaymentToken: '0.8', // in usdc
            paymentTokenAddress: StableCoinAddress,
            slippageBps: 0,
            deadlineDelta: 1 * (60 * 60 * 24), // delta: 1 day
            side: 0,
            feeTokenAddress,
        }, {
            takerPaymentTokenAmount,
            tradedBps: 9000,
            fee1RateBps: 900,
            fee1TokenAddress: StableCoinAddress,
            fee2RateBps: 100,
            fee2TokenAddress: turingTokenAddress,
        })

        await checkRz(takerOrder, makerOrders);
    })

    step(`taker Buy A 0.8 * 100, maker1 buy A' 0.2 * 20, marker2 buy A' 0.6 * 80`, async () => {
        const feeTokenAddress = await getContractAddress('USDTMock')
        const StableCoinAddress = await getContractAddress('USDTMock')
        const turingTokenAddress = await getContractAddress('TuringToken')

        const users = await getUnnamedAccounts();

        const makerOrders = [
            await generateOrderData({
                maker: users[1],
                tokenId: 2,
                tokenAmount: '20',
                tokenPriceInPaymentToken: '0.2', // in usdc
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
            await generateOrderData({
                maker: users[2],
                tokenId: 2,
                tokenAmount: '80',
                tokenPriceInPaymentToken: '0.6', // in usdc
                paymentTokenAddress: StableCoinAddress,
                slippageBps: 0,
                deadlineDelta: 1 * (60 * 60 * 24), // delta: 1 day
                side: 0,
                feeTokenAddress,
            }, {
                takerPrice: '0.6',
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
            tokenPriceInPaymentToken: '0.8', // in usdc
            paymentTokenAddress: StableCoinAddress,
            slippageBps: 0,
            deadlineDelta: 1 * (60 * 60 * 24), // delta: 1 day
            side: 0,
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

    step(`taker Buy A 0.5 * 100, markers: 0.5 * 10 + 0.5 * 20 + 0.5 * 30 + 0.5 * 40`, async () => {
        const feeTokenAddress = await getContractAddress('USDTMock')
        const StableCoinAddress = await getContractAddress('USDTMock')
        const turingTokenAddress = await getContractAddress('TuringToken')

        const users = await getUnnamedAccounts();

        const makerOrders = [
            await generateOrderData({
                maker: users[1],
                tokenId: 2,
                tokenAmount: '10',
                tokenPriceInPaymentToken: '0.5', // in usdc
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
            await generateOrderData({
                maker: users[2],
                tokenId: 2,
                tokenAmount: '20',
                tokenPriceInPaymentToken: '0.5', // in usdc
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
            await generateOrderData({
                maker: users[3],
                tokenId: 2,
                tokenAmount: '30',
                tokenPriceInPaymentToken: '0.5', // in usdc
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
            await generateOrderData({
                maker: users[4],
                tokenId: 2,
                tokenAmount: '40',
                tokenPriceInPaymentToken: '0.5', // in usdc
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
            })
        ];

        let takerPaymentTokenAmount = 0n;
        for (let i = 0; i < makerOrders.length; i++) {
            takerPaymentTokenAmount = makerOrders[i].nftPairPaymentAmount.add(takerPaymentTokenAmount)
        }
        const takerOrder = await generateOrderData({
            maker: users[0],
            tokenId: 1,
            tokenAmount: '100',
            tokenPriceInPaymentToken: '0.5', // in usdc
            paymentTokenAddress: StableCoinAddress,
            slippageBps: 0,
            deadlineDelta: 1 * (60 * 60 * 24), // delta: 1 day
            side: 0,
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

    step(`taker Buy 0.8 * 100, maker1 buy A' 0.2 * 90, marker2 buy A' 0.5 * 20 (tradedBps: 5000)`, async () => {
        const feeTokenAddress = await getContractAddress('USDTMock')
        const StableCoinAddress = await getContractAddress('USDTMock')
        const turingTokenAddress = await getContractAddress('TuringToken')

        const users = await getUnnamedAccounts();
        const makerOrders = [
            await generateOrderData({
                maker: users[1],
                tokenId: 2,
                tokenAmount: '90',
                tokenPriceInPaymentToken: '0.2', // in usdc
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
            await generateOrderData({
                maker: users[2],
                tokenId: 2,
                tokenAmount: '20',
                tokenPriceInPaymentToken: '0.5', // in usdc
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
            takerPaymentTokenAmount = makerOrders[i].nftPairPaymentAmount.add(takerPaymentTokenAmount)
        }
        const takerOrder = await generateOrderData({
            maker: users[0],
            tokenId: 1,
            tokenAmount: '100',
            tokenPriceInPaymentToken: '0.8', // in usdc
            paymentTokenAddress: StableCoinAddress,
            slippageBps: 0,
            deadlineDelta: 1 * (60 * 60 * 24), // delta: 1 day
            side: 0,
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

    step(`MixNormal: taker Buy 0.8 * 100, maker1 buy A' 0.2 * 90, marker2 sell A 0.8 * 10`, async () => {
        const feeTokenAddress = await getContractAddress('USDTMock')
        const StableCoinAddress = await getContractAddress('USDTMock')
        const turingTokenAddress = await getContractAddress('TuringToken')

        const users = await getUnnamedAccounts();
        const makerOrders = [
            await generateOrderData({
                maker: users[1],
                tokenId: 2,
                tokenAmount: '90',
                tokenPriceInPaymentToken: '0.2', // in usdc
                paymentTokenAddress: StableCoinAddress,
                slippageBps: 0,
                deadlineDelta: 1 * (60 * 60 * 24), // delta: 1 day
                side: 0,
                feeTokenAddress,
            }, {
                // tradedBps: 80/90*10000,
                fee1RateBps: 900,
                fee1TokenAddress: StableCoinAddress,
                fee2RateBps: 100,
                fee2TokenAddress: turingTokenAddress,
            }),
            await generateOrderData({
                maker: users[2],
                tokenId: 1,
                tokenAmount: '10',
                tokenPriceInPaymentToken: '0.8', // in usdc
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
        const takerOrderSide = 0;
        for (let i = 0; i < makerOrders.length; i++) {
            if (makerOrders[i].side == takerOrderSide) {
                takerPaymentTokenAmount = makerOrders[i].nftPairPaymentAmount.add(takerPaymentTokenAmount)
            } else {
                takerPaymentTokenAmount = makerOrders[i].paymentTokenAmount.add(takerPaymentTokenAmount)
            }
            theDebug(`maker ${i} : ${takerPaymentTokenAmount}`)
        }
        const takerOrder = await generateOrderData({
            maker: users[0],
            tokenId: 1,
            tokenAmount: '100',
            tokenPriceInPaymentToken: '0.8', // in usdc
            paymentTokenAddress: StableCoinAddress,
            slippageBps: 0,
            deadlineDelta: 1 * (60 * 60 * 24), // delta: 1 day
            side: takerOrderSide,
            feeTokenAddress,
        }, {
            takerPaymentTokenAmount,
            fee1RateBps: 900,
            fee1TokenAddress: StableCoinAddress,
            fee2RateBps: 100,
            fee2TokenAddress: turingTokenAddress,
        })
        const orderMatcherUserAddress = (await getSignerByKey('orderMatcher1')).address
        const diamondAddress = await getContractAddress('PredMoonApp')

        const facetAdmin = await getFacetWithSignerKey('PredMoonApp', 'AdminFacet', 'orderMatcher1')
        const facetOrderMatcher = await getFacetWithSignerKey('PredMoonApp', 'OrderMatcherFacet', 'orderMatcher1')
        const facetERC1155 = await getFacetWithSignerKey('PredMoonApp', 'ERC1155Facet', 'orderMatcher1')

        const oldBalance = await facetERC1155.balanceOf(takerOrder.maker, takerOrder.tokenId)
        const tx = await facetOrderMatcher.matchOrder(takerOrder, makerOrders, getConfig('TradeType').mint)

        const StableCoinContract = await getContractWithSignerKey('USDTMock', 'deployer')

        await expect(tx).to.emit(StableCoinContract, "Transfer").withArgs(takerOrder.maker, diamondAddress, takerOrder.paymentTokenAmount)
        await expect(tx).to.emit(facetERC1155, 'TransferSingle').withArgs(orderMatcherUserAddress, ethers.constants.AddressZero, takerOrder.maker, takerOrder.tokenId, makerOrders[0].exchangeNftAmount)
        await expect(tx).to.emit(facetERC1155, 'TransferSingle').withArgs(orderMatcherUserAddress, makerOrders[1].maker, takerOrder.maker, takerOrder.tokenId, makerOrders[1].exchangeNftAmount)
        const newBalance = await facetERC1155.balanceOf(takerOrder.maker, takerOrder.tokenId)
        expect(newBalance).to.be.equal(oldBalance.add(takerOrder.exchangeNftAmount))
        for (let i = 0; i < makerOrders.length; i++) {
            theDebug(`maker ${i} : ${makerOrders[i].maker}`)
            if (makerOrders[i].side == 0) {
                await expect(tx).to.emit(StableCoinContract, "Transfer").withArgs(makerOrders[i].maker, diamondAddress, makerOrders[i].paymentTokenAmount);
                await expect(tx).to.emit(facetERC1155, 'TransferSingle').withArgs(orderMatcherUserAddress, ethers.constants.AddressZero, makerOrders[i].maker, makerOrders[i].tokenId, makerOrders[i].exchangeNftAmount)
            } else if (makerOrders[i].side == 1) {
                await expect(tx).to.emit(StableCoinContract, "Transfer").withArgs(diamondAddress, makerOrders[i].maker, makerOrders[i].paymentTokenAmount);
                await expect(tx).to.emit(facetERC1155, 'TransferSingle').withArgs(orderMatcherUserAddress, makerOrders[i].maker, takerOrder.maker, makerOrders[i].tokenId, makerOrders[i].exchangeNftAmount)
            } else {
                throw new Error(`order side is not correct ${i}`)
            }
        }

        const onChainRemaining = await facetAdmin.getRemainingAmount(takerOrder)
        const offChainRemaining = takerOrder.tokenAmount - takerOrder.exchangeNftAmount
        expect(onChainRemaining).to.be.equal(offChainRemaining)
    })

    step(`MixNormal: taker Buy 0.8 * 100, maker1 buy A' 0.2 * 90, marker2 sell A 0.5 * 20`, async () => {
        const feeTokenAddress = await getContractAddress('USDTMock')
        const StableCoinAddress = await getContractAddress('USDTMock')
        const turingTokenAddress = await getContractAddress('TuringToken')

        const users = await getUnnamedAccounts();
        const makerOrders = [
            await generateOrderData({
                maker: users[1],
                tokenId: 2,
                tokenAmount: '90',
                tokenPriceInPaymentToken: '0.2', // in usdc
                paymentTokenAddress: StableCoinAddress,
                slippageBps: 0,
                deadlineDelta: 1 * (60 * 60 * 24), // delta: 1 day
                side: 0,
                feeTokenAddress,
            }, {
                // tradedBps: 80/90*10000,
                fee1RateBps: 900,
                fee1TokenAddress: StableCoinAddress,
                fee2RateBps: 100,
                fee2TokenAddress: turingTokenAddress,
            }),
            await generateOrderData({
                maker: users[2],
                tokenId: 1,
                tokenAmount: '20',
                tokenPriceInPaymentToken: '0.5', // in usdc
                paymentTokenAddress: StableCoinAddress,
                slippageBps: 0,
                deadlineDelta: 1 * (60 * 60 * 24), // delta: 1 day
                side: 1,
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
        const takerOrderSide = 0;
        for (let i = 0; i < makerOrders.length; i++) {
            if (makerOrders[i].side == takerOrderSide) {
                takerPaymentTokenAmount = makerOrders[i].nftPairPaymentAmount.add(takerPaymentTokenAmount)
            } else {
                takerPaymentTokenAmount = makerOrders[i].paymentTokenAmount.add(takerPaymentTokenAmount)
            }
            theDebug(`maker ${i} : ${takerPaymentTokenAmount}`)
        }
        const takerOrder = await generateOrderData({
            maker: users[0],
            tokenId: 1,
            tokenAmount: '100',
            tokenPriceInPaymentToken: '0.8', // in usdc
            paymentTokenAddress: StableCoinAddress,
            slippageBps: 0,
            deadlineDelta: 1 * (60 * 60 * 24), // delta: 1 day
            side: takerOrderSide,
            feeTokenAddress,
        }, {
            takerPaymentTokenAmount,
            fee1RateBps: 900,
            fee1TokenAddress: StableCoinAddress,
            fee2RateBps: 100,
            fee2TokenAddress: turingTokenAddress,
        })
        const orderMatcherUserAddress = (await getSignerByKey('orderMatcher1')).address
        const diamondAddress = await getContractAddress('PredMoonApp')

        const facetAdmin = await getFacetWithSignerKey('PredMoonApp', 'AdminFacet', 'orderMatcher1')
        const facetOrderMatcher = await getFacetWithSignerKey('PredMoonApp', 'OrderMatcherFacet', 'orderMatcher1')
        const facetERC1155 = await getFacetWithSignerKey('PredMoonApp', 'ERC1155Facet', 'orderMatcher1')
        const oldBalance = await facetERC1155.balanceOf(takerOrder.maker, takerOrder.tokenId)
        const tx = await facetOrderMatcher.matchOrder(takerOrder, makerOrders, getConfig('TradeType').mint)

        const StableCoinContract = await getContractWithSignerKey('USDTMock', 'deployer')

        await expect(tx).to.emit(StableCoinContract, "Transfer").withArgs(takerOrder.maker, diamondAddress, takerOrder.paymentTokenAmount)
        await expect(tx).to.emit(facetERC1155, 'TransferSingle').withArgs(orderMatcherUserAddress, ethers.constants.AddressZero, takerOrder.maker, takerOrder.tokenId, makerOrders[0].exchangeNftAmount)
        await expect(tx).to.emit(facetERC1155, 'TransferSingle').withArgs(orderMatcherUserAddress, makerOrders[1].maker, takerOrder.maker, takerOrder.tokenId, makerOrders[1].exchangeNftAmount)
        const newBalance = await facetERC1155.balanceOf(takerOrder.maker, takerOrder.tokenId)
        expect(newBalance).to.be.equal(oldBalance.add(takerOrder.exchangeNftAmount))
        for (let i = 0; i < makerOrders.length; i++) {
            theDebug(`maker ${i} : ${makerOrders[i].maker}`)
            if (makerOrders[i].side == 0) {
                await expect(tx).to.emit(StableCoinContract, "Transfer").withArgs(makerOrders[i].maker, diamondAddress, makerOrders[i].paymentTokenAmount);
                await expect(tx).to.emit(facetERC1155, 'TransferSingle').withArgs(orderMatcherUserAddress, ethers.constants.AddressZero, makerOrders[i].maker, makerOrders[i].tokenId, makerOrders[i].exchangeNftAmount)
            } else if (makerOrders[i].side == 1) {
                await expect(tx).to.emit(StableCoinContract, "Transfer").withArgs(diamondAddress, makerOrders[i].maker, makerOrders[i].paymentTokenAmount);
                await expect(tx).to.emit(facetERC1155, 'TransferSingle').withArgs(orderMatcherUserAddress, makerOrders[i].maker, takerOrder.maker, makerOrders[i].tokenId, makerOrders[i].exchangeNftAmount)
            } else {
                throw new Error(`order side is not correct ${i}`)
            }
        }

        const onChainRemaining = await facetAdmin.getRemainingAmount(takerOrder)
        const offChainRemaining = takerOrder.tokenAmount - takerOrder.exchangeNftAmount
        expect(onChainRemaining).to.be.equal(offChainRemaining)
    })
    step(`MixNormal: taker Buy 0.8 * 100, maker1 buy A' 0.2 * 90, marker2 sell A 0.5 * 5`, async () => {
        const feeTokenAddress = await getContractAddress('USDTMock')
        const StableCoinAddress = await getContractAddress('USDTMock')
        const turingTokenAddress = await getContractAddress('TuringToken')

        const users = await getUnnamedAccounts();
        const makerOrders = [
            await generateOrderData({
                maker: users[1],
                tokenId: 2,
                tokenAmount: '90',
                tokenPriceInPaymentToken: '0.2', // in usdc
                paymentTokenAddress: StableCoinAddress,
                slippageBps: 0,
                deadlineDelta: 1 * (60 * 60 * 24), // delta: 1 day
                side: 0,
                feeTokenAddress,
            }, {
                // tradedBps: 80/90*10000,
                fee1RateBps: 900,
                fee1TokenAddress: StableCoinAddress,
                fee2RateBps: 100,
                fee2TokenAddress: turingTokenAddress,
            }),
            await generateOrderData({
                maker: users[2],
                tokenId: 1,
                tokenAmount: '5',
                tokenPriceInPaymentToken: '0.5', // in usdc
                paymentTokenAddress: StableCoinAddress,
                slippageBps: 0,
                deadlineDelta: 1 * (60 * 60 * 24), // delta: 1 day
                side: 1,
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
        let theExchangeNftAmount = BigInt(0);
        const takerOrderSide = 0;
        for (let i = 0; i < makerOrders.length; i++) {
            if (makerOrders[i].side == takerOrderSide) {
                takerPaymentTokenAmount = makerOrders[i].nftPairPaymentAmount.add(takerPaymentTokenAmount)
            } else {
                takerPaymentTokenAmount = makerOrders[i].paymentTokenAmount.add(takerPaymentTokenAmount)
            }
            theDebug(`maker ${i} : ${makerOrders[i].exchangeNftAmount}`)
            theExchangeNftAmount = BigInt(makerOrders[i].exchangeNftAmount) + (theExchangeNftAmount)
            theDebug(`maker ${i} : ${takerPaymentTokenAmount}`)
        }
        const takerOrder = await generateOrderData({
            maker: users[0],
            tokenId: 1,
            tokenAmount: '100',
            tokenPriceInPaymentToken: '0.8', // in usdc
            paymentTokenAddress: StableCoinAddress,
            slippageBps: 0,
            deadlineDelta: 1 * (60 * 60 * 24), // delta: 1 day
            side: takerOrderSide,
            feeTokenAddress,
        }, {
            theExchangeNftAmount,
            takerPaymentTokenAmount,
            fee1RateBps: 900,
            fee1TokenAddress: StableCoinAddress,
            fee2RateBps: 100,
            fee2TokenAddress: turingTokenAddress,
        })
        const orderMatcherUserAddress = (await getSignerByKey('orderMatcher1')).address
        const diamondAddress = await getContractAddress('PredMoonApp')

        const facetAdmin = await getFacetWithSignerKey('PredMoonApp', 'AdminFacet', 'orderMatcher1')
        const facetOrderMatcher = await getFacetWithSignerKey('PredMoonApp', 'OrderMatcherFacet', 'orderMatcher1')
        const facetERC1155 = await getFacetWithSignerKey('PredMoonApp', 'ERC1155Facet', 'orderMatcher1')
        const oldBalance = await facetERC1155.balanceOf(takerOrder.maker, takerOrder.tokenId)
        const tx = await facetOrderMatcher.matchOrder(takerOrder, makerOrders, getConfig('TradeType').mint)

        const StableCoinContract = await getContractWithSignerKey('USDTMock', 'deployer')

        await expect(tx).to.emit(StableCoinContract, "Transfer").withArgs(takerOrder.maker, diamondAddress, takerOrder.paymentTokenAmount)
        await expect(tx).to.emit(facetERC1155, 'TransferSingle').withArgs(orderMatcherUserAddress, ethers.constants.AddressZero, takerOrder.maker, takerOrder.tokenId, makerOrders[0].exchangeNftAmount)
        await expect(tx).to.emit(facetERC1155, 'TransferSingle').withArgs(orderMatcherUserAddress, makerOrders[1].maker, takerOrder.maker, takerOrder.tokenId, makerOrders[1].exchangeNftAmount)
        const newBalance = await facetERC1155.balanceOf(takerOrder.maker, takerOrder.tokenId)
        expect(newBalance).to.be.equal(oldBalance.add(takerOrder.exchangeNftAmount))
        for (let i = 0; i < makerOrders.length; i++) {
            theDebug(`maker ${i} : ${makerOrders[i].maker}`)
            if (makerOrders[i].side == 0) {
                await expect(tx).to.emit(StableCoinContract, "Transfer").withArgs(makerOrders[i].maker, diamondAddress, makerOrders[i].paymentTokenAmount);
                await expect(tx).to.emit(facetERC1155, 'TransferSingle').withArgs(orderMatcherUserAddress, ethers.constants.AddressZero, makerOrders[i].maker, makerOrders[i].tokenId, makerOrders[i].exchangeNftAmount)
            } else if (makerOrders[i].side == 1) {
                await expect(tx).to.emit(StableCoinContract, "Transfer").withArgs(diamondAddress, makerOrders[i].maker, makerOrders[i].paymentTokenAmount);
                await expect(tx).to.emit(facetERC1155, 'TransferSingle').withArgs(orderMatcherUserAddress, makerOrders[i].maker, takerOrder.maker, makerOrders[i].tokenId, makerOrders[i].exchangeNftAmount)
            } else {
                throw new Error(`order side is not correct ${i}`)
            }
        }

        const onChainRemaining = await facetAdmin.getRemainingAmount(takerOrder)
        const offChainRemaining = BigInt(takerOrder.tokenAmount) - takerOrder.exchangeNftAmount
        expect(onChainRemaining).to.be.equal(offChainRemaining)
    })

    step(`MixNormal: taker Buy 0.8 * 100, maker1 buy A' 0.2 * 90, marker2 sell A 0.5 * 10`, async () => {
        const feeTokenAddress = await getContractAddress('USDTMock')
        const StableCoinAddress = await getContractAddress('USDTMock')
        const turingTokenAddress = await getContractAddress('TuringToken')

        const users = await getUnnamedAccounts();
        const makerOrders = [
            await generateOrderData({
                maker: users[1],
                tokenId: 2,
                tokenAmount: '90',
                tokenPriceInPaymentToken: '0.2', // in usdc
                paymentTokenAddress: StableCoinAddress,
                slippageBps: 0,
                deadlineDelta: 1 * (60 * 60 * 24), // delta: 1 day
                side: 0,
                feeTokenAddress,
            }, {
                // tradedBps: 80/90*10000,
                fee1RateBps: 900,
                fee1TokenAddress: StableCoinAddress,
                fee2RateBps: 100,
                fee2TokenAddress: turingTokenAddress,
            }),
            await generateOrderData({
                maker: users[2],
                tokenId: 1,
                tokenAmount: '10',
                tokenPriceInPaymentToken: '0.5', // in usdc
                paymentTokenAddress: StableCoinAddress,
                slippageBps: 0,
                deadlineDelta: 1 * (60 * 60 * 24), // delta: 1 day
                side: 1,
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
        let theExchangeNftAmount = BigInt(0);
        const takerOrderSide = 0;
        for (let i = 0; i < makerOrders.length; i++) {
            if (makerOrders[i].side == takerOrderSide) {
                takerPaymentTokenAmount = makerOrders[i].nftPairPaymentAmount.add(takerPaymentTokenAmount)
            } else {
                takerPaymentTokenAmount = makerOrders[i].paymentTokenAmount.add(takerPaymentTokenAmount)
            }
            theDebug(`maker ${i} : ${makerOrders[i].exchangeNftAmount}`)
            theExchangeNftAmount = BigInt(makerOrders[i].exchangeNftAmount) + (theExchangeNftAmount)
            theDebug(`maker ${i} : ${takerPaymentTokenAmount}`)
        }
        const takerOrder = await generateOrderData({
            maker: users[0],
            tokenId: 1,
            tokenAmount: '100',
            tokenPriceInPaymentToken: '0.8', // in usdc
            paymentTokenAddress: StableCoinAddress,
            slippageBps: 0,
            deadlineDelta: 1 * (60 * 60 * 24), // delta: 1 day
            side: takerOrderSide,
            feeTokenAddress,
        }, {
            theExchangeNftAmount,
            takerPaymentTokenAmount,
            fee1RateBps: 900,
            fee1TokenAddress: StableCoinAddress,
            fee2RateBps: 100,
            fee2TokenAddress: turingTokenAddress,
        })
        const orderMatcherUserAddress = (await getSignerByKey('orderMatcher1')).address
        const diamondAddress = await getContractAddress('PredMoonApp')

        const facetAdmin = await getFacetWithSignerKey('PredMoonApp', 'AdminFacet', 'orderMatcher1')
        const facetOrderMatcher = await getFacetWithSignerKey('PredMoonApp', 'OrderMatcherFacet', 'orderMatcher1')
        const facetERC1155 = await getFacetWithSignerKey('PredMoonApp', 'ERC1155Facet', 'orderMatcher1')
        const oldBalance = await facetERC1155.balanceOf(takerOrder.maker, takerOrder.tokenId)
        const tx = await facetOrderMatcher.matchOrder(takerOrder, makerOrders, getConfig('TradeType').mint)

        const StableCoinContract = await getContractWithSignerKey('USDTMock', 'deployer')

        await expect(tx).to.emit(StableCoinContract, "Transfer").withArgs(takerOrder.maker, diamondAddress, takerOrder.paymentTokenAmount)
        await expect(tx).to.emit(facetERC1155, 'TransferSingle').withArgs(orderMatcherUserAddress, ethers.constants.AddressZero, takerOrder.maker, takerOrder.tokenId, makerOrders[0].exchangeNftAmount)
        await expect(tx).to.emit(facetERC1155, 'TransferSingle').withArgs(orderMatcherUserAddress, makerOrders[1].maker, takerOrder.maker, takerOrder.tokenId, makerOrders[1].exchangeNftAmount)
        const newBalance = await facetERC1155.balanceOf(takerOrder.maker, takerOrder.tokenId)
        expect(newBalance).to.be.equal(oldBalance.add(takerOrder.exchangeNftAmount))
        for (let i = 0; i < makerOrders.length; i++) {
            theDebug(`maker ${i} : ${makerOrders[i].maker}`)
            if (makerOrders[i].side == 0) {
                await expect(tx).to.emit(StableCoinContract, "Transfer").withArgs(makerOrders[i].maker, diamondAddress, makerOrders[i].paymentTokenAmount);
                await expect(tx).to.emit(facetERC1155, 'TransferSingle').withArgs(orderMatcherUserAddress, ethers.constants.AddressZero, makerOrders[i].maker, makerOrders[i].tokenId, makerOrders[i].exchangeNftAmount)
            } else if (makerOrders[i].side == 1) {
                await expect(tx).to.emit(StableCoinContract, "Transfer").withArgs(diamondAddress, makerOrders[i].maker, makerOrders[i].paymentTokenAmount);
                await expect(tx).to.emit(facetERC1155, 'TransferSingle').withArgs(orderMatcherUserAddress, makerOrders[i].maker, takerOrder.maker, makerOrders[i].tokenId, makerOrders[i].exchangeNftAmount)
            } else {
                throw new Error(`order side is not correct ${i}`)
            }
        }

        const onChainRemaining = await facetAdmin.getRemainingAmount(takerOrder)
        const offChainRemaining = BigInt(takerOrder.tokenAmount) - takerOrder.exchangeNftAmount
        expect(onChainRemaining).to.be.equal(offChainRemaining)
    })

    // TODO
    // xstep(`taker order exceed maxFeeRateBps`)
    // xstep(`maker order exceed maxFeeRateBps`)
    // xstep(`taker do not have enough paymentToken`)
    // xstep(`maker do not have enough paymentToken`)
});