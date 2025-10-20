import {Button, Result} from "antd";
import {useNavigate} from "react-router-dom";
import {t} from '@/language'

export default function Page404() {
    const navigate = useNavigate()
    return (
        <Result
            status="404"
            title="404"
            subTitle={t('tipPage.noPage')}
            extra={<Button type="primary" onClick={() => navigate('/')}>{t('tipPage.backHome')}</Button>}
        />
    )
}