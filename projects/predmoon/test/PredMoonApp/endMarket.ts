import initData from './utils/initData'
const scope = getNameForTag(__dirname, __filename)
const theDebug = require('debug')(scope)
describe(scope, () => {
    let marketId = ''
    before(async () => {
        const rz = await initData()
        marketId = rz.marketId
    });

    step('should end market successed', async () => {
        const facet = await getFacetWithSignerKey('PredMoonApp', 'MarketManagerFacet', 'marketManagerRoleB')
        await expect(facet.endMarket(marketId, 1))
            .to.emit(facet, "MarketEnded")
            .withArgs(marketId, 1);
    })
});