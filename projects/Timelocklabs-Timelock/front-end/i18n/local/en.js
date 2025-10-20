// 统一的多语言配置 - 英文
// 从统一的 local 目录导入所有模块
import common from './en/common.json';

// 核心模块
import home from './en/home.json';
import login from './en/login.json';
import navigation from './en/navigation.json';

// 功能模块
import transactionsLog from './en/transactions-log.json';
import transactions from './en/transactions.json';
import timelocks from './en/timelocks.json';
import notify from './en/notify.json';
import importTimelock from './en/import-timelock.json';
import ecosystem from './en/ecosystem.json';
import createTransaction from './en/create-transaction.json';
import createTimelock from './en/create-timelock.json';
import abiLib from './en/abi-lib.json';

// 如果其他模块还未迁移，临时从原路径导入









export default {
	// 公共配置
	...common,
	
	// 已迁移到统一结构的模块
	...home,
	...login,
	...navigation,
	...abiLib,
	...createTimelock,
	...createTransaction,
	...ecosystem,
	...importTimelock,
	...notify,
	...timelocks,
	...transactions,
	...transactionsLog,








};
