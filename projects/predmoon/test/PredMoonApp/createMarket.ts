import initData from './utils/initData'
const scope = getNameForTag(__dirname, __filename)
const theDebug = require('debug')(scope)
describe(scope, () => {
    let marketId = ''
    before(async () => {
        const rz = await initData()
        marketId = randomId()
    });

    step('should create market successed', async () => {
        const facet = await getFacetWithSignerKey('PredMoonApp', 'MarketManagerFacet', 'marketManagerRoleB')
        const facet2 = await getFacetWithSignerKey('PredMoonApp', 'ERC1155Facet', 'marketManagerRoleB')
        const idx = parseInt(await facet2.idx())
        await expect(facet.createMarket(marketId))
            .to.emit(facet, "MarketCreated")
            .withArgs(marketId, idx + 1, idx + 2);

        const StableCoinAddress = await getContractAddress('USDTMock')
        const facetM = await getFacetWithSignerKey('PredMoonApp', 'MarketManagerFacet', 'orderMatcher1')
        const marketInfo = await facetM.getMarketInfo(marketId, StableCoinAddress)
        debugObject(theDebug, {marketInfo})
    })

    step('should failed if use the same marketId', async () => {
        const facet = await getFacetWithSignerKey('PredMoonApp', 'MarketManagerFacet', 'marketManagerRoleB')
        await expect(facet.createMarket(marketId))
            .to.be.revertedWithCustomError(facet, "MarketAlreadyExists")
    })

    // step('should failed if the signer is not marketManager', async () => {
    //     const libDiamond = await getFacetWithSignerKey('LibDiamond', 'nobody')
    //     const facet = await getFacetWithSignerKey('MarketManagerFacet', 'nobody')
    //     await expect(facet.createMarket(randomId()))
    //         .to.be.revertedWithCustomError(libDiamond, "PermissionDenied")
    // })
});