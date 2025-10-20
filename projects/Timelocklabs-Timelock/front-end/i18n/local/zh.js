// 统一的多语言配置 - 中文
// 从统一的 local 目录导入所有模块
import common from './zh/common.json';

// 核心模块
import home from './zh/home.json';
import login from './zh/login.json';
import navigation from './zh/navigation.json';

// 功能模块
import transactionsLog from './zh/transactions-log.json';
import transactions from './zh/transactions.json';
import timelocks from './zh/timelocks.json';
import notify from './zh/notify.json';
import importTimelock from './zh/import-timelock.json';
import ecosystem from './zh/ecosystem.json';
import createTransaction from './zh/create-transaction.json';
import createTimelock from './zh/create-timelock.json';
import abiLib from './zh/abi-lib.json';

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
