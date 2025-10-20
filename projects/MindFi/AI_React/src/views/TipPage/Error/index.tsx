import React from 'react';
import {Button, Result} from 'antd';
import {t} from '@/language';
import {useNavigate} from "react-router-dom";

const Error: React.FC = () => {
    const navigate = useNavigate()
    return <Result
        status="500"
        title="500"
        subTitle="Sorry, something went wrong."
        extra={<Button type="primary" onClick={() => navigate('/')}>{t('tipPage.backHome')}</Button>}
    />
};

export default Error;