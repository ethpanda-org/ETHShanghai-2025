'use client';
import React from 'react';
import Channel from './components/channel';
import Email from './components/email/index';
import EmailRulesHeader from './components/email/components/EmailRulesHeader';

const EmailNotificationPage: React.FC = () => {
	return (
		<div className='flex flex-col space-y-8'>
			<EmailRulesHeader />
			<Channel />
			<Email />
		</div>
	);
};

export default EmailNotificationPage;
