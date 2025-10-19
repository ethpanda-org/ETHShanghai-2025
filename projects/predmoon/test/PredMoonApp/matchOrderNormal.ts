import initData from './utils/initData'
import { generateOrderData } from './utils/generateOrderData'

const scope = getNameForTag(__dirname, __filename)
const theDebug = require('debug')(scope)
describe(scope, () => {
    // ### Scenario 2 - Normal transaction
    // * user1 buys 100 `A` and transfers 50 `C` to the exchange
    // * user2 sells 100 `A` and receives 50 `C` from the exchange
    let marketId = ''
    before(async () => {
        const rz = await initData()
        marketId = randomId()
    });

    const checkRz = async (takerOrder, makerOrders) => {
        const orderMatcherUserAddress = (await getSignerByKey('orderMatcher1')).address
        const diamondAddress = await getContractAddress('PredMoonApp')

        const StableCoinContract = await getContractWithSignerKey('USDTMock', 'deployer')
        const facetOrderMatcher = await getFacetWithSignerKey('PredMoonApp', 'OrderMatcherFacet', 'orderMatcher1')
        const facetERC1155 = await getFacetWithSignerKey('PredMoonApp', 'ERC1155Facet', 'orderMatcher1')
        const oldNftBalanceOfTaker = await facetERC1155.balanceOf(takerOrder.maker, takerOrder.tokenId)

        const tx = await facetOrderMatcher.matchOrder(takerOrder, makerOrders, getConfig('TradeType').normal)

        if (takerOrder.side == 0) {
            // Taker buys
            // Transfer the taker's StableCoin to the exchange
            await expect(tx).to.emit(StableCoinContract, "Transfer").withArgs(takerOrder.maker, diamondAddress, takerOrder.paymentTokenAmount)
            expect(await facetERC1155.balanceOf(takerOrder.maker, takerOrder.tokenId)).to.be.equal(oldNftBalanceOfTaker.add(takerOrder.exchangeNftAmount))
            for (let i = 0; i < makerOrders.length; i++) {
                const makerOrder = makerOrders[i]
                await expect(tx).to.emit(facetERC1155, 'TransferSingle').withArgs(orderMatcherUserAddress, makerOrder.maker, takerOrder.maker, makerOrder.tokenId, makerOrder.exchangeNftAmount)
            }
        } else {
            // taker sold
            await expect(tx).to.emit(StableCoinContract, "Transfer").withArgs(diamondAddress, takerOrder.maker, takerOrder.paymentTokenAmount)
            expect(await facetERC1155.balanceOf(takerOrder.maker, takerOrder.tokenId)).to.be.equal(oldNftBalanceOfTaker.sub(takerOrder.exchangeNftAmount))
            for (let i = 0; i < makerOrders.length; i++) {
                const makerOrder = makerOrders[i]
                await expect(tx).to.emit(facetERC1155, 'TransferSingle').withArgs(orderMatcherUserAddress, takerOrder.maker, makerOrder.maker, makerOrder.tokenId, makerOrder.exchangeNftAmount)
            }
        }
    }

    step(`taker buy A 0.2 * 100, maker1 sell A 0.2 * 60, maker2 sell A 0.2 * 80(tradedBps=5000)`, async () => {
        const feeTokenAddress = await getContractAddress('USDTMock')
        const StableCoinAddress = await getContractAddress('USDTMock')
        const turingTokenAddress = await getContractAddress('TuringToken')

        const users = await getUnnamedAccounts()
        const takerOrder = await generateOrderData({
            maker: users[0],
            tokenId: 1,
            tokenAmount: '100',
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
        })

        const makerOrders = [
            await generateOrderData({
                maker: users[1],
                tokenId: 1,
                tokenAmount: '60',
                tokenPriceInPaymentToken: '0.2', // in usdc
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
                tokenAmount: '80',
                tokenPriceInPaymentToken: '0.2', // in usdc
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
        await checkRz(takerOrder, makerOrders);
    })

    step(`taker sell A 0.2 * 100, maker1 buy A 0.2 * 60, maker2 buy A 0.2 * 80(tradedBps=5000)`, async () => {
        const feeTokenAddress = await getContractAddress('USDTMock')
        const StableCoinAddress = await getContractAddress('USDTMock')
        const turingTokenAddress = await getContractAddress('TuringToken')

        const users = await getUnnamedAccounts()
        const takerOrder = await generateOrderData({
            maker: users[0],
            tokenId: 1,
            tokenAmount: '100',
            tokenPriceInPaymentToken: '0.2', // in usdc
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
        })

        const makerOrders = [
            await generateOrderData({
                maker: users[1],
                tokenId: 1,
                tokenAmount: '60',
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
                maker: users[1],
                tokenId: 1,
                tokenAmount: '80',
                tokenPriceInPaymentToken: '0.2', // in usdc
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
        await checkRz(takerOrder, makerOrders);
    })

});

