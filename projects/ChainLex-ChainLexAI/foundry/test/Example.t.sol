// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import "forge-std/Test.sol";
import "../src/example.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract ExampleTest is Test {
    uRWA20 public token;
    address public owner;
    address public user1;
    address public user2;
    address public user3;

    uint256 public constant INITIAL_SUPPLY = 1000 * 10**18;
    uint256 public constant MINT_AMOUNT = 500 * 10**18;
    uint256 public constant FREEZE_AMOUNT = 200 * 10**18;
    uint256 public constant TRANSFER_AMOUNT = 100 * 10**18;

    event Whitelisted(address indexed account, bool status);
    event Frozen(address indexed user, uint256 indexed tokenId, uint256 amount);
    event ForcedTransfer(address indexed from, address indexed to, uint256 tokenId, uint256 amount);

    function setUp() public {
        owner = address(this);
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
        user3 = makeAddr("user3");

        vm.deal(owner, 100 ether);
        vm.deal(user1, 100 ether);
        vm.deal(user2, 100 ether);
        vm.deal(user3, 100 ether);

        token = new uRWA20("Test Token", "TEST", owner);
    }

    // ========== 构造函数测试 ==========
    function testConstructor() public {
        assertEq(token.name(), "Test Token");
        assertEq(token.symbol(), "TEST");
        assertEq(token.owner(), owner);
        assertTrue(token.isWhitelisted(owner));
        assertEq(token.totalSupply(), 0);
    }

    // ========== 白名单功能测试 ==========
    function testChangeWhitelist() public {
        assertFalse(token.isWhitelisted(user1));

        vm.expectEmit(true, false, false, true);
        emit Whitelisted(user1, true);
        token.changeWhitelist(user1, true);

        assertTrue(token.isWhitelisted(user1));

        vm.expectEmit(true, false, false, true);
        emit Whitelisted(user1, false);
        token.changeWhitelist(user1, false);

        assertFalse(token.isWhitelisted(user1));
    }

    function testChangeWhitelistOnlyOwner() public {
        vm.prank(user1);
        vm.expectRevert();
        token.changeWhitelist(user2, true);
    }

    function testChangeWhitelistZeroAddress() public {
        vm.expectRevert();
        token.changeWhitelist(address(0), true);
    }

    // ========== 铸造功能测试 ==========
    function testMint() public {
        token.changeWhitelist(user1, true);

        vm.expectEmit(true, true, true, false);
        emit IERC20.Transfer(address(0), user1, MINT_AMOUNT);
        token.mint(user1, MINT_AMOUNT);

        assertEq(token.balanceOf(user1), MINT_AMOUNT);
        assertEq(token.totalSupply(), MINT_AMOUNT);
    }

    function testMintOnlyOwner() public {
        vm.prank(user1);
        vm.expectRevert();
        token.mint(user2, MINT_AMOUNT);
    }

    function testMintZeroAddress() public {
        vm.expectRevert();
        token.mint(address(0), MINT_AMOUNT);
    }

    function testMintNotAllowedUser() public {
        vm.expectRevert(abi.encodeWithSelector(IERC7943.ERC7943NotAllowedUser.selector, user1));
        token.mint(user1, MINT_AMOUNT);
    }

    function testMintToMultipleNotAllowedUsers() public {
        // 测试多个未授权用户的铸造失败，确保覆盖所有分支
        vm.expectRevert(abi.encodeWithSelector(IERC7943.ERC7943NotAllowedUser.selector, user1));
        token.mint(user1, MINT_AMOUNT);

        vm.expectRevert(abi.encodeWithSelector(IERC7943.ERC7943NotAllowedUser.selector, user2));
        token.mint(user2, MINT_AMOUNT);

        vm.expectRevert(abi.encodeWithSelector(IERC7943.ERC7943NotAllowedUser.selector, user3));
        token.mint(user3, MINT_AMOUNT);
    }

    // ========== 销毁功能测试 ==========
    function testBurn() public {
        token.changeWhitelist(user1, true);
        token.mint(user1, MINT_AMOUNT);

        uint256 burnAmount = 50 * 10**18;
        vm.prank(user1);
        token.burn(burnAmount);

        assertEq(token.balanceOf(user1), MINT_AMOUNT - burnAmount);
        assertEq(token.totalSupply(), MINT_AMOUNT - burnAmount);
    }

    function testBurnInsufficientBalance() public {
        token.changeWhitelist(user1, true);
        token.mint(user1, MINT_AMOUNT);

        vm.prank(user1);
        vm.expectRevert();
        token.burn(MINT_AMOUNT + 1);
    }

    function testBurnFrom() public {
        token.changeWhitelist(user1, true);
        token.mint(user1, MINT_AMOUNT);

        uint256 burnAmount = 50 * 10**18;
        token.burnFrom(user1, burnAmount);

        assertEq(token.balanceOf(user1), MINT_AMOUNT - burnAmount);
        assertEq(token.totalSupply(), MINT_AMOUNT - burnAmount);
    }

    function testBurnFromOnlyOwner() public {
        vm.prank(user1);
        vm.expectRevert();
        token.burnFrom(user2, MINT_AMOUNT);
    }

    function testBurnFromInsufficientBalance() public {
        token.changeWhitelist(user1, true);
        token.mint(user1, MINT_AMOUNT);

        vm.expectRevert();
        token.burnFrom(user1, MINT_AMOUNT + 1);
    }

    // ========== 冻结功能测试 ==========
    function testSetFrozen() public {
        token.changeWhitelist(user1, true);
        token.mint(user1, MINT_AMOUNT);

        vm.expectEmit(true, true, false, true);
        emit Frozen(user1, 0, FREEZE_AMOUNT);
        token.setFrozen(user1, 0, FREEZE_AMOUNT);

        assertEq(token.getFrozen(user1, 0), FREEZE_AMOUNT);
    }

    function testSetFrozenOnlyOwner() public {
        vm.prank(user1);
        vm.expectRevert();
        token.setFrozen(user2, 0, FREEZE_AMOUNT);
    }

    function testSetFrozenInsufficientBalance() public {
        token.changeWhitelist(user1, true);
        token.mint(user1, MINT_AMOUNT);

        vm.expectRevert();
        token.setFrozen(user1, 0, MINT_AMOUNT + 1);
    }

    // ========== 转账功能测试 ==========
    function testTransfer() public {
        token.changeWhitelist(user1, true);
        token.changeWhitelist(user2, true);
        token.mint(user1, MINT_AMOUNT);

        vm.prank(user1);
        token.transfer(user2, TRANSFER_AMOUNT);

        assertEq(token.balanceOf(user1), MINT_AMOUNT - TRANSFER_AMOUNT);
        assertEq(token.balanceOf(user2), TRANSFER_AMOUNT);
    }

    function testTransferNotWhitelistedFrom() public {
        token.changeWhitelist(user1, true);
        token.changeWhitelist(user2, true);
        token.mint(user1, MINT_AMOUNT);

        // 将user1移出白名单
        token.changeWhitelist(user1, false);

        vm.prank(user1);
        vm.expectRevert(abi.encodeWithSelector(IERC7943.ERC7943NotAllowedTransfer.selector, user1, user2, 0, TRANSFER_AMOUNT));
        token.transfer(user2, TRANSFER_AMOUNT);
    }

    function testTransferNotWhitelistedTo() public {
        token.changeWhitelist(user1, true);
        token.mint(user1, MINT_AMOUNT);

        vm.prank(user1);
        vm.expectRevert(abi.encodeWithSelector(IERC7943.ERC7943NotAllowedTransfer.selector, user1, user2, 0, TRANSFER_AMOUNT));
        token.transfer(user2, TRANSFER_AMOUNT);
    }

    function testTransferFrozenTokens() public {
        token.changeWhitelist(user1, true);
        token.changeWhitelist(user2, true);
        token.mint(user1, MINT_AMOUNT);
        token.setFrozen(user1, 0, FREEZE_AMOUNT);

        // 尝试转账超过未冻结余额的数量
        uint256 excessTransfer = MINT_AMOUNT - FREEZE_AMOUNT + 1; // 301 * 10**18

        vm.prank(user1);
        vm.expectRevert(abi.encodeWithSelector(IERC7943.ERC7943InsufficientUnfrozenBalance.selector, user1, 0, excessTransfer, MINT_AMOUNT - FREEZE_AMOUNT));
        token.transfer(user2, excessTransfer);
    }

    function testTransferInsufficientBalance() public {
        token.changeWhitelist(user1, true);
        token.changeWhitelist(user2, true);
        token.mint(user1, MINT_AMOUNT);

        vm.prank(user1);
        vm.expectRevert();
        token.transfer(user2, MINT_AMOUNT + 1);
    }

    // ========== transferFrom 测试 ==========
    function testTransferFrom() public {
        token.changeWhitelist(user1, true);
        token.changeWhitelist(user2, true);
        token.changeWhitelist(owner, true);
        token.mint(user1, MINT_AMOUNT);

        vm.prank(user1);
        token.approve(owner, TRANSFER_AMOUNT);

        vm.prank(owner);
        token.transferFrom(user1, user2, TRANSFER_AMOUNT);

        assertEq(token.balanceOf(user1), MINT_AMOUNT - TRANSFER_AMOUNT);
        assertEq(token.balanceOf(user2), TRANSFER_AMOUNT);
    }

    function testTransferFromNotWhitelisted() public {
        token.changeWhitelist(user1, true);
        token.changeWhitelist(owner, true);
        token.mint(user1, MINT_AMOUNT);

        vm.prank(user1);
        token.approve(owner, TRANSFER_AMOUNT);

        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(IERC7943.ERC7943NotAllowedTransfer.selector, user1, user2, 0, TRANSFER_AMOUNT));
        token.transferFrom(user1, user2, TRANSFER_AMOUNT);
    }

    // ========== 强制转账功能测试 ==========
    function testForceTransfer() public {
        token.changeWhitelist(user1, true);
        token.changeWhitelist(user2, true);
        token.mint(user1, MINT_AMOUNT);

        vm.expectEmit(true, true, true, true);
        emit ForcedTransfer(user1, user2, 0, TRANSFER_AMOUNT);
        token.forceTransfer(user1, user2, 0, TRANSFER_AMOUNT);

        assertEq(token.balanceOf(user1), MINT_AMOUNT - TRANSFER_AMOUNT);
        assertEq(token.balanceOf(user2), TRANSFER_AMOUNT);
    }

    function testForceTransferWithFrozenTokens() public {
        token.changeWhitelist(user1, true);
        token.changeWhitelist(user2, true);
        token.mint(user1, MINT_AMOUNT);
        token.setFrozen(user1, 0, FREEZE_AMOUNT);

        token.forceTransfer(user1, user2, 0, TRANSFER_AMOUNT);

        assertEq(token.balanceOf(user1), MINT_AMOUNT - TRANSFER_AMOUNT);
        assertEq(token.balanceOf(user2), TRANSFER_AMOUNT);
        assertEq(token.getFrozen(user1, 0), FREEZE_AMOUNT - (TRANSFER_AMOUNT > (MINT_AMOUNT - FREEZE_AMOUNT) ? TRANSFER_AMOUNT - (MINT_AMOUNT - FREEZE_AMOUNT) : 0));
    }

    function testForceTransferWithExcessFrozenUpdate() public {
        // 测试 _excessFrozenUpdate 中 amount > unfrozenBalance && amount <= balanceOf(user) 的分支
        token.changeWhitelist(user1, true);
        token.changeWhitelist(user2, true);
        token.mint(user1, MINT_AMOUNT);

        // 冻结大部分代币，只留少量未冻结
        uint256 highFreezeAmount = MINT_AMOUNT - 50 * 10**18; // 冻结 450，留下 50 未冻结
        token.setFrozen(user1, 0, highFreezeAmount);

        // 转账金额超过未冻结余额但不超过总余额
        uint256 excessTransfer = 100 * 10**18; // 超过未冻结余额 (50) 但不超过总余额 (500)

        token.forceTransfer(user1, user2, 0, excessTransfer);

        // 验证冻结余额被正确减少
        assertEq(token.getFrozen(user1, 0), highFreezeAmount - (excessTransfer - (MINT_AMOUNT - highFreezeAmount)));
        assertEq(token.balanceOf(user1), MINT_AMOUNT - excessTransfer);
        assertEq(token.balanceOf(user2), excessTransfer);
    }

    function testForceTransferOnlyOwner() public {
        vm.prank(user1);
        vm.expectRevert();
        token.forceTransfer(user2, user3, 0, TRANSFER_AMOUNT);
    }

    function testForceTransferToNotAllowedUser() public {
        token.changeWhitelist(user1, true);
        token.mint(user1, MINT_AMOUNT);

        vm.expectRevert(abi.encodeWithSelector(IERC7943.ERC7943NotAllowedUser.selector, user2));
        token.forceTransfer(user1, user2, 0, TRANSFER_AMOUNT);
    }

    // ========== isUserAllowed 测试 ==========
    function testIsUserAllowed() public {
        assertTrue(token.isUserAllowed(owner));
        assertFalse(token.isUserAllowed(user1));

        token.changeWhitelist(user1, true);
        assertTrue(token.isUserAllowed(user1));

        token.changeWhitelist(user1, false);
        assertFalse(token.isUserAllowed(user1));
    }

    // ========== isTransferAllowed 测试 ==========
    function testIsTransferAllowed() public {
        token.changeWhitelist(user1, true);
        token.changeWhitelist(user2, true);
        token.mint(user1, MINT_AMOUNT);

        assertTrue(token.isTransferAllowed(user1, user2, 0, TRANSFER_AMOUNT));
    }

    function testIsTransferAllowedNotWhitelisted() public {
        token.changeWhitelist(user1, true);
        token.mint(user1, MINT_AMOUNT);

        assertFalse(token.isTransferAllowed(user1, user2, 0, TRANSFER_AMOUNT));
    }

    function testIsTransferAllowedInsufficientBalance() public {
        token.changeWhitelist(user1, true);
        token.changeWhitelist(user2, true);
        token.mint(user1, MINT_AMOUNT);

        assertFalse(token.isTransferAllowed(user1, user2, 0, MINT_AMOUNT + 1));
    }

    function testIsTransferAllowedFrozenTokens() public {
        token.changeWhitelist(user1, true);
        token.changeWhitelist(user2, true);
        token.mint(user1, MINT_AMOUNT);
        token.setFrozen(user1, 0, FREEZE_AMOUNT);

        assertFalse(token.isTransferAllowed(user1, user2, 0, MINT_AMOUNT - FREEZE_AMOUNT + 1));
    }

    // ========== supportsInterface 测试 ==========
    function testSupportsInterface() public {
        assertTrue(token.supportsInterface(type(IERC7943).interfaceId));
        assertTrue(token.supportsInterface(type(IERC20).interfaceId));
        assertTrue(token.supportsInterface(type(IERC165).interfaceId));
        assertFalse(token.supportsInterface(bytes4(0x12345678)));
    }

    // ========== 边界情况测试 ==========
    function testZeroAmountTransfer() public {
        token.changeWhitelist(user1, true);
        token.changeWhitelist(user2, true);
        token.mint(user1, MINT_AMOUNT);

        vm.prank(user1);
        token.transfer(user2, 0);

        assertEq(token.balanceOf(user1), MINT_AMOUNT);
        assertEq(token.balanceOf(user2), 0);
    }

    function testZeroAmountMint() public {
        token.changeWhitelist(user1, true);
        token.mint(user1, 0);

        assertEq(token.balanceOf(user1), 0);
        assertEq(token.totalSupply(), 0);
    }

    function testZeroAmountBurn() public {
        token.changeWhitelist(user1, true);
        token.mint(user1, MINT_AMOUNT);

        vm.prank(user1);
        token.burn(0);

        assertEq(token.balanceOf(user1), MINT_AMOUNT);
        assertEq(token.totalSupply(), MINT_AMOUNT);
    }

    function testZeroAmountFreeze() public {
        token.changeWhitelist(user1, true);
        token.mint(user1, MINT_AMOUNT);

        token.setFrozen(user1, 0, 0);

        assertEq(token.getFrozen(user1, 0), 0);
    }

    // ========== 复杂场景测试 ==========
    function testComplexScenario() public {
        // 设置多个用户
        token.changeWhitelist(user1, true);
        token.changeWhitelist(user2, true);
        token.changeWhitelist(user3, true);

        // 铸造代币给多个用户
        token.mint(user1, MINT_AMOUNT);
        token.mint(user2, MINT_AMOUNT * 2);
        token.mint(user3, MINT_AMOUNT / 2);

        assertEq(token.totalSupply(), MINT_AMOUNT + MINT_AMOUNT * 2 + MINT_AMOUNT / 2);

        // 冻结部分代币
        token.setFrozen(user1, 0, FREEZE_AMOUNT);
        token.setFrozen(user2, 0, FREEZE_AMOUNT * 2);

        // 正常转账
        vm.prank(user1);
        token.transfer(user2, TRANSFER_AMOUNT);

        // 强制转账
        token.forceTransfer(user2, user3, 0, TRANSFER_AMOUNT);

        // 检查最终状态
        assertEq(token.balanceOf(user1), MINT_AMOUNT - TRANSFER_AMOUNT);
        assertEq(token.balanceOf(user2), MINT_AMOUNT * 2 + TRANSFER_AMOUNT - TRANSFER_AMOUNT);
        assertEq(token.balanceOf(user3), MINT_AMOUNT / 2 + TRANSFER_AMOUNT);

        // 销毁代币
        token.burnFrom(user1, 50 * 10**18);
        assertEq(token.totalSupply(), MINT_AMOUNT + MINT_AMOUNT * 2 + MINT_AMOUNT / 2 - 50 * 10**18);
    }

    // ========== Fuzz 测试 ==========
    function testFuzzTransfer(uint256 amount) public {
        vm.assume(amount > 0 && amount <= MINT_AMOUNT);

        token.changeWhitelist(user1, true);
        token.changeWhitelist(user2, true);
        token.mint(user1, MINT_AMOUNT);

        vm.prank(user1);
        token.transfer(user2, amount);

        assertEq(token.balanceOf(user1), MINT_AMOUNT - amount);
        assertEq(token.balanceOf(user2), amount);
    }

    function testFuzzMint(uint256 amount) public {
        vm.assume(amount > 0 && amount <= 10000 * 10**18);

        token.changeWhitelist(user1, true);
        token.mint(user1, amount);

        assertEq(token.balanceOf(user1), amount);
        assertEq(token.totalSupply(), amount);
    }
}