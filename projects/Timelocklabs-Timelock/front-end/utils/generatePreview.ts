const generatePreview = ({
	allTimelocks,
	timelockType,
	functionValue,
	argumentValues,
	selectedMailbox,
	timeValue,
	targetCalldata,
	abiValue,
	address,
	timelockAddress,
	timelockMethod,
	target,
	value,
	description,
	timelockCalldata,
}: {
	allTimelocks: { id: string | number; chain_name?: string }[];
	timelockType: string;
	functionValue: string;
	argumentValues: string[];
	selectedMailbox: string[];
	timeValue: number | null | undefined;
	targetCalldata?: string;
	abiValue?: string;
	address?: string;
	timelockAddress?: string;
	timelockMethod?: string;
	target?: string;
	value?: string | number;
	description?: string;
	timelockCalldata?: string;
}) => {
	// Get selected timelock's chain name
	const selectedTimelock = allTimelocks.find(tl => tl.id.toString() === timelockType);
	const chainName = selectedTimelock?.chain_name || 'Not selected';

	// Format arguments for display
	let argsDisplay = '    No arguments';
	if (functionValue && argumentValues.length > 0) {
		try {
			// Parse functionValue, e.g. "transfer(address to, uint256 amount)"
			const fnMatch = functionValue.match(/\((.*)\)/);
			const params = fnMatch && fnMatch[1] ? fnMatch[1].split(',').map(s => s.trim()) : [];
			argsDisplay = argumentValues
				.map((arg, idx) => {
					const param = params[idx] || '';
					// param: "address to" or "uint256 amount"
					const [type, ...nameParts] = param.split(' ');
					const name = nameParts.join(' ');
					return `    ${name || `arg${idx + 1}`}${type ? ` (${type})` : ''}: ${arg || 'N/A'}`;
				})
				.join('\n');
		} catch {
			argsDisplay = argumentValues.map((arg, index) => `    arg${index + 1}: ${arg || 'N/A'}`).join('\n');
		}
	}

	// Format selected mailboxes
	const mailboxesDisplay = selectedMailbox.length > 0 ? selectedMailbox.join(', ') : 'None';

	// Format ETA
	const etaDisplay = timeValue ? new Date(timeValue * 1000).toLocaleString() : 'Not specified';

	// Format calldata
	const calldataDisplay = targetCalldata || abiValue || 'Not generated';

	const type = timelockMethod?.split('(')[0] || 'Not selected';

	return [
		'==================== Transaction Preview ====================',
		`Chain:             ${chainName}`,
		`Wallet:            ${address || 'Not connected'}`,
		``,
		'----------------------- Function Call ------------------------',
		`Target:            ${target || 'Not specified'}`,
		`Value:             ${value || '0'}`,
		`Function:          ${functionValue || 'Not selected'}`,
		'Arguments:',
		argsDisplay,
		`Calldata:          ${calldataDisplay}`,
		``,
		'-------------------- Transaction Onchain ---------------------',
		`To:                ${timelockAddress || 'Not selected'}`,
		`Value:             ${value || '0'}`,
		`Calldata:          ${timelockCalldata || 'Not generated'}`,
		``,
		'-------------------------------------------------------------',
		`Timelock:          ${timelockAddress || 'Not selected'}`,
		`Type:              ${type || 'No description'}`,
		// `Description:       ${description || 'No description'}`,
		`Mailboxes:         ${mailboxesDisplay}`,
		`ETA (Time):        ${etaDisplay}`,
		``,
		'=============================================================',
	].join('\n');
};

export default generatePreview;
