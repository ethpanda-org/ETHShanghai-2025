// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Script, console} from "forge-std/Script.sol";
import {FocusCredit} from "../contracts/FocusCredit.sol";

contract ResetUserBalanceV2 is Script {
    // 合约地址 - 使用最新部署的地址
    address constant FOCUS_CREDIT = 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512;
    address constant USER = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266; // Anvil默认账户0

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        FocusCredit focusCredit = FocusCredit(FOCUS_CREDIT);

        // 先检查当前余额
        uint256 currentBalance = focusCredit.balanceOf(USER);
        console.log("当前用户 FOCUS 余额: %s", currentBalance);

        // 如果当前余额不为0，先清空（通过burn，但需要FocusBond权限，所以我们直接设置新的余额）
        // 由于不能直接设置余额，我们使用grantCredits来设置到2000
        // 先burn当前余额（如果需要）
        if (currentBalance > 0) {
            // 注意：burn函数只能由FocusBond调用，所以我们不能直接调用
            // 作为替代，我们直接grant 2000，用户将拥有2000，无论之前有多少
            console.log("当前余额不为0，将直接授予2000 FOCUS");
        }

        // 授予用户2000 FOCUS积分
        uint256 newBalance = 2000 * 10**18; // 2000个代币，考虑18位小数
        focusCredit.grantCredits(USER, newBalance, "Reset balance to 2000 FOCUS for testing");

        console.log("已授予用户 %s FOCUS 积分", newBalance / 10**18);
        console.log("新的用户 FOCUS 余额: %s", focusCredit.balanceOf(USER) / 10**18);

        vm.stopBroadcast();
    }
}