export const generateOrderData = async (
    { maker, tokenId, tokenAmount, tokenPriceInPaymentToken, paymentTokenAddress, slippageBps, deadlineDelta, side, feeTokenAddress },
    { theExchangeNftAmount = '', takerPrice = '', takerPaymentTokenAmount = '', tradedBps = 10000, fee1RateBps = 1000, fee1TokenAddress = ethers.constants.AddressZero, fee2RateBps = 0, fee2TokenAddress = ethers.constants.AddressZero }
) => {
    const tokenDecimals = 6; // the condition nft decimals is 6
    const paymentTokenDecimals = 6;
    const deadline = await ethers.provider.getBlock('latest').then(block => block.timestamp + deadlineDelta);

    let order = {
        salt: randomId(),
        maker,
        tokenId,
        tokenAmount: parseUnits(tokenAmount, tokenDecimals),
        tokenPriceInPaymentToken: parseUnits(tokenPriceInPaymentToken, paymentTokenDecimals),
        paymentTokenAddress,
        slippageBps,
        deadline,
        side,
        feeTokenAddress,
    };
    order.sig = await signEIP712Data('PredMoonApp', getConfig('TYPEHASH_ORDER'), order, await ethers.getSigner(maker));
    let exchangeNftAmount = (order.tokenAmount * tradedBps / 10000).toString()
    if (theExchangeNftAmount != '') {
        exchangeNftAmount = theExchangeNftAmount;
    }
    let paymentTokenAmount = order.tokenPriceInPaymentToken.mul(exchangeNftAmount).div((10 ** tokenDecimals).toString());
    let nftPairPaymentAmount = parseUnits('1', paymentTokenDecimals).sub(order.tokenPriceInPaymentToken).mul(exchangeNftAmount).div((10 ** tokenDecimals).toString());
    if (takerPrice != '') {
        paymentTokenAmount = parseUnits(takerPrice, paymentTokenDecimals).mul(exchangeNftAmount).div((10 ** tokenDecimals).toString());
    }
    if (takerPaymentTokenAmount != '') {
        paymentTokenAmount = takerPaymentTokenAmount;
    }
    const adminFacet = await getFacetWithSignerKey('PredMoonApp', 'AdminFacet', 'nobody');

    let fee1Amount = 0;
    if (fee1TokenAddress !== ethers.constants.AddressZero) {
        const rz = await adminFacet.getFeeTokenInfo(fee1TokenAddress);
        const { priceStableCoin, decimals } = rz;
        // fee1Amount = (paymentTokenAmount * fee1RateBps / 10000) * (10 ** decimals) / priceStableCoin;
        fee1Amount = paymentTokenAmount.mul(fee1RateBps).mul((10 ** decimals).toString()).div('10000').div(priceStableCoin);
    }

    let fee2Amount = 0;
    if (fee2TokenAddress !== ethers.constants.AddressZero) {
        const { priceStableCoin, decimals } = await adminFacet.getFeeTokenInfo(fee2TokenAddress);
        // fee2Amount = (paymentTokenAmount * fee2RateBps / 10000) * (10 ** decimals) / priceStableCoin;
        fee2Amount = paymentTokenAmount.mul(fee2RateBps).mul((10 ** decimals).toString()).div('10000').div(priceStableCoin);
    }

    order = {
        ...order,
        exchangeNftAmount,
        paymentTokenAmount,
        // server calc
        fee1Amount,
        fee1TokenAddress,
        fee2Amount,
        fee2TokenAddress,
        // for test only
        nftPairPaymentAmount,
        tradedBps,
    }
    // console.log('order', order);
    return order;
}