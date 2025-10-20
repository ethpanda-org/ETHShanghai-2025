// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import "forge-std/Test.sol";
import "../src/ChainlinkRisk.sol";
import "../src/uRWA.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract URWAWithRiskTest is Test {
    uRWA public token;
    ChainlinkRisk public riskContract;
    address public owner;
    address public user1;
    address public user2;
    address public user3;
    address public riskUpdater;

    uint256 public constant MINT_AMOUNT = 1000 * 10**18;
    uint256 public constant TRANSFER_AMOUNT = 100 * 10**18;

    function setUp() public {
        owner = address(this);
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
        user3 = makeAddr("user3");
        riskUpdater = makeAddr("riskUpdater");

        vm.deal(owner, 100 ether);
        vm.deal(user1, 100 ether);
        vm.deal(user2, 100 ether);
        vm.deal(user3, 100 ether);
        vm.deal(riskUpdater, 100 ether);

        // 部署 ChainlinkRisk 合约
        riskContract = new ChainlinkRisk(owner);

        // 设置风险更新者为授权调用者
        riskContract.setAuthorizedCaller(riskUpdater, true);

        // 部署 uRWA 合约
        token = new uRWA(
            "Test Token with Risk",
            "TEST-R",
            owner,
            address(riskContract)
        );
    }

    // ========== 基础功能测试 ==========

    function testConstructor() public view {
        assertEq(token.name(), "Test Token with Risk");
        assertEq(token.symbol(), "TEST-R");
        assertEq(token.owner(), owner);
        assertTrue(token.enableRiskAssessment());
        assertTrue(token.enableWhitelist());
        assertEq(address(token.riskAssessment()), address(riskContract));
    }

    function testInterfaceSupport() public view {
        assertTrue(token.supportsInterface(type(IERC7943).interfaceId));
        assertTrue(token.supportsInterface(type(IERC20).interfaceId));
        assertTrue(token.supportsInterface(type(IERC165).interfaceId));
    }

    // ========== 风险评估模式测试 ==========

    function testToggleRiskAssessment() public {
        assertTrue(token.enableRiskAssessment());

        token.toggleRiskAssessment(false);
        assertFalse(token.enableRiskAssessment());

        token.toggleRiskAssessment(true);
        assertTrue(token.enableRiskAssessment());
    }

    function testToggleWhitelist() public {
        assertTrue(token.enableWhitelist());

        token.toggleWhitelist(false);
        assertFalse(token.enableWhitelist());

        token.toggleWhitelist(true);
        assertTrue(token.enableWhitelist());
    }

    // ========== 风险评估集成测试 ==========

    function testUserAllowedWithRiskAssessment() public {
        // 默认情况下，用户应该被允许（因为没有风险评估数据）
        assertTrue(token.isUserAllowed(user1));

        // 设置用户为高风险
        vm.prank(riskUpdater);
        riskContract.updateRiskAssessment(
            user1,
            ChainlinkRisk.RiskLevel.HIGH,
            800,
            "High risk activity detected",
            false
        );

        // 现在用户应该不被允许
        assertFalse(token.isUserAllowed(user1));
    }

    function testUserAllowedWithWhitelistFallback() public {
        // 禁用风险评估
        token.toggleRiskAssessment(false);

        // 用户不在白名单中，应该不被允许
        assertFalse(token.isUserAllowed(user1));

        // 添加到白名单
        token.changeWhitelist(user1, true);
        assertTrue(token.isUserAllowed(user1));
    }

    function testUserAllowedWithReason() public {
        // 测试无风险评估数据的情况
        (bool allowed, string memory reason) = token.isUserAllowedWithReason(user1);
        assertTrue(allowed);
        assertEq(reason, "Risk assessment failed, whitelist disabled");

        // 设置用户为高风险
        vm.prank(riskUpdater);
        riskContract.updateRiskAssessment(
            user1,
            ChainlinkRisk.RiskLevel.BLOCKED,
            1000,
            "Blocked user",
            true
        );

        (allowed, reason) = token.isUserAllowedWithReason(user1);
        assertFalse(allowed);
        assertEq(reason, "User is blacklisted");
    }

    function testTransferAllowedWithRiskAssessment() public {
        // 给用户1一些代币
        token.changeWhitelist(user1, true);
        token.mint(user1, MINT_AMOUNT);

        // 默认情况下应该允许转账
        assertTrue(token.isTransferAllowed(user1, user2, 0, TRANSFER_AMOUNT));

        // 设置用户2为高风险
        vm.prank(riskUpdater);
        riskContract.updateRiskAssessment(
            user2,
            ChainlinkRisk.RiskLevel.HIGH,
            800,
            "High risk recipient",
            false
        );

        // 现在转账应该不被允许
        assertFalse(token.isTransferAllowed(user1, user2, 0, TRANSFER_AMOUNT));
    }

    function testTransferAllowedWithReason() public {
        // 给用户1一些代币
        token.changeWhitelist(user1, true);
        token.mint(user1, MINT_AMOUNT);

        // 设置用户2为黑名单
        vm.prank(riskUpdater);
        riskContract.updateRiskAssessment(
            user2,
            ChainlinkRisk.RiskLevel.BLOCKED,
            1000,
            "Blacklisted recipient",
            true
        );

        (bool allowed, string memory reason) = token.isTransferAllowedWithReason(user1, user2, TRANSFER_AMOUNT);
        assertFalse(allowed);
        // 检查原因包含 "Recipient not allowed"
        assertTrue(_contains(reason, "Recipient not allowed"));
    }

    // ========== 铸造功能测试 ==========

    function testMintWithRiskAssessment() public {
        // 正常用户应该可以铸造
        token.mint(user1, MINT_AMOUNT);
        assertEq(token.balanceOf(user1), MINT_AMOUNT);
    }

    function testMintBlockedUser() public {
        // 设置用户为被阻止
        vm.prank(riskUpdater);
        riskContract.updateRiskAssessment(
            user1,
            ChainlinkRisk.RiskLevel.BLOCKED,
            1000,
            "Blocked for AML violations",
            true
        );

        vm.expectRevert();
        token.mint(user1, MINT_AMOUNT);
    }

    function testMintWithWhitelistFallback() public {
        // 禁用风险评估
        token.toggleRiskAssessment(false);

        // 用户不在白名单中，铸造应该失败
        vm.expectRevert();
        token.mint(user1, MINT_AMOUNT);

        // 添加到白名单
        token.changeWhitelist(user1, true);
        token.mint(user1, MINT_AMOUNT);
        assertEq(token.balanceOf(user1), MINT_AMOUNT);
    }

    // ========== 转账功能测试 ==========

    function testTransferWithRiskAssessment() public {
        // 设置用户并给代币
        token.changeWhitelist(user1, true);
        token.changeWhitelist(user2, true);
        token.mint(user1, MINT_AMOUNT);

        // 正常转账应该成功
        vm.prank(user1);
        token.transfer(user2, TRANSFER_AMOUNT);
        assertEq(token.balanceOf(user2), TRANSFER_AMOUNT);
    }

    function testTransferBlockedRecipient() public {
        // 设置用户并给代币
        token.changeWhitelist(user1, true);
        token.mint(user1, MINT_AMOUNT);

        // 设置接收方为高风险
        vm.prank(riskUpdater);
        riskContract.updateRiskAssessment(
            user2,
            ChainlinkRisk.RiskLevel.HIGH,
            800,
            "Suspicious activity",
            false
        );

        // 转账应该失败
        vm.prank(user1);
        vm.expectRevert();
        token.transfer(user2, TRANSFER_AMOUNT);
    }

    // ========== 强制转账测试 ==========

    function testForceTransferWithRiskAssessment() public {
        // 给用户1代币
        token.changeWhitelist(user1, true);
        token.mint(user1, MINT_AMOUNT);

        // 设置接收方为高风险
        vm.prank(riskUpdater);
        riskContract.updateRiskAssessment(
            user2,
            ChainlinkRisk.RiskLevel.HIGH,
            800,
            "High risk but not blocked",
            false
        );

        // 强制转账到高风险用户应该失败
        vm.expectRevert();
        token.forceTransfer(user1, user2, 0, TRANSFER_AMOUNT);

        // 但是强制转账到正常用户应该成功
        token.changeWhitelist(user2, true);
        token.forceTransfer(user1, user2, 0, TRANSFER_AMOUNT);
        assertEq(token.balanceOf(user2), TRANSFER_AMOUNT);
    }

    // ========== 风险评估查询测试 ==========

    function testGetUserRiskAssessment() public {
        // 设置用户风险评估
        vm.prank(riskUpdater);
        riskContract.updateRiskAssessment(
            user1,
            ChainlinkRisk.RiskLevel.MEDIUM,
            500,
            "Medium risk detected",
            false
        );

        ChainlinkRisk.RiskAssessment memory assessment = token.getUserRiskAssessment(user1);
        assertEq(uint256(assessment.level), uint256(ChainlinkRisk.RiskLevel.MEDIUM));
        assertEq(assessment.score, 500);
        assertEq(assessment.reason, "Medium risk detected");
        assertFalse(assessment.isBlacklisted);
    }

    function testGetBatchRiskAssessments() public {
        // 设置多个用户风险评估
        vm.startPrank(riskUpdater);
        riskContract.updateRiskAssessment(user1, ChainlinkRisk.RiskLevel.LOW, 200, "Low risk", false);
        riskContract.updateRiskAssessment(user2, ChainlinkRisk.RiskLevel.HIGH, 800, "High risk", false);
        riskContract.updateRiskAssessment(user3, ChainlinkRisk.RiskLevel.BLOCKED, 1000, "Blocked", true);
        vm.stopPrank();

        address[] memory users = new address[](3);
        users[0] = user1;
        users[1] = user2;
        users[2] = user3;

        ChainlinkRisk.RiskAssessment[] memory assessments = token.getBatchRiskAssessments(users);

        assertEq(uint256(assessments[0].level), uint256(ChainlinkRisk.RiskLevel.LOW));
        assertEq(uint256(assessments[1].level), uint256(ChainlinkRisk.RiskLevel.HIGH));
        assertEq(uint256(assessments[2].level), uint256(ChainlinkRisk.RiskLevel.BLOCKED));
    }

    // ========== 复杂场景测试 ==========

    function testComplexRiskScenario() public {
        // 设置多个用户的风险评估
        vm.startPrank(riskUpdater);
        riskContract.updateRiskAssessment(user1, ChainlinkRisk.RiskLevel.LOW, 200, "Clean user", false);
        riskContract.updateRiskAssessment(user2, ChainlinkRisk.RiskLevel.MEDIUM, 500, "Some concerns", false);
        riskContract.updateRiskAssessment(user3, ChainlinkRisk.RiskLevel.BLOCKED, 1000, "Sanctioned", true);
        vm.stopPrank();

        // 给低风险用户代币
        token.mint(user1, MINT_AMOUNT);

        // 低风险到中等风险的转账应该成功
        vm.prank(user1);
        token.transfer(user2, TRANSFER_AMOUNT);
        assertEq(token.balanceOf(user2), TRANSFER_AMOUNT);

        // 到被阻止用户的转账应该失败
        vm.prank(user2);
        vm.expectRevert();
        token.transfer(user3, 50 * 10**18);

        // 管理员可以强制转账到任何用户（除了被阻止的）
        token.forceTransfer(user2, user1, 0, 25 * 10**18);
        assertEq(token.balanceOf(user1), MINT_AMOUNT - TRANSFER_AMOUNT + 25 * 10**18);

        // 但不能强制转账到被阻止的用户
        vm.expectRevert();
        token.forceTransfer(user1, user3, 0, 10 * 10**18);
    }

    function testEmergencyFreeze() public {
        // 给用户代币
        token.mint(user1, MINT_AMOUNT);

        // 正常转账应该成功
        vm.prank(user1);
        token.transfer(user2, TRANSFER_AMOUNT);
        assertEq(token.balanceOf(user1), MINT_AMOUNT - TRANSFER_AMOUNT);

        // 紧急冻结用户
        riskContract.emergencyFreeze(user1, "Emergency AML freeze");

        // 现在用户不能转账
        vm.prank(user1);
        vm.expectRevert();
        token.transfer(user2, 50 * 10**18);
    }

    // ========== 错误处理测试 ==========

    function testRiskAssessmentContractFailure() public {
        // 部署新的 uRWA 但使用零地址作为风险评估合约
        vm.expectRevert();
        new uRWA("Test", "TEST", owner, address(0));
    }

    function testModeSwitching() public {
        // 设置用户风险评估
        vm.prank(riskUpdater);
        riskContract.updateRiskAssessment(
            user1,
            ChainlinkRisk.RiskLevel.HIGH,
            800,
            "High risk",
            false
        );

        // 风险评估启用时，用户不应该被允许
        assertFalse(token.isUserAllowed(user1));

        // 禁用风险评估，启用白名单
        token.toggleRiskAssessment(false);

        // 用户不在白名单中，仍然不应该被允许
        assertFalse(token.isUserAllowed(user1));

        // 添加到白名单
        token.changeWhitelist(user1, true);

        // 现在用户应该被允许
        assertTrue(token.isUserAllowed(user1));

        // 重新启用风险评估
        token.toggleRiskAssessment(true);

        // 风险评估应该优先，用户不应该被允许
        assertFalse(token.isUserAllowed(user1));
    }

    // ========== 辅助函数 ==========

    function _contains(string memory str, string memory substr) internal pure returns (bool) {
        bytes memory strBytes = bytes(str);
        bytes memory substrBytes = bytes(substr);

        if (substrBytes.length > strBytes.length) {
            return false;
        }

        for (uint256 i = 0; i <= strBytes.length - substrBytes.length; i++) {
            bool found = true;
            for (uint256 j = 0; j < substrBytes.length; j++) {
                if (strBytes[i + j] != substrBytes[j]) {
                    found = false;
                    break;
                }
            }
            if (found) {
                return true;
            }
        }

        return false;
    }
}