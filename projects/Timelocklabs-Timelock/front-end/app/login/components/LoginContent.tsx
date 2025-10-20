'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { LoginButton } from '@/components/wallet/login-button';

export default function LoginContent() {
  const t = useTranslations('walletLogin');
  const locale = useLocale();
  const [isContentVisible, setIsContentVisible] = useState(false);
  
  const textStyle1 = locale === 'zh' ? 'text-6xl tracking-wide' : 'text-[42px]';
  const textStyle2 = locale === 'zh' ? 'text-6xl tracking-wide' : 'text-[42px]';

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsContentVisible(true);
    }, 200);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`relative font-medium flex flex-col w-[580px] h-full justify-center items-center transition-all duration-1000 ease-out ${
      isContentVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
    }`}>
      <div className=" flex justify-center items-center w-[300px] h-full relative">
        <div className="absolute top-0 left-0 w-full h-1/2" style={{backgroundImage: "url('/bg-left-logo.svg')", backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat"}}></div>
        <div className="absolute bottom-0 left-0 w-full h-1/2" style={{backgroundImage: "url('/bg-left-logo.svg')", backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat"}}></div>
        <div className='w-[360px] flex flex-col relative z-10'>
          <div className={`${textStyle1} font-medium text-left leading-tight whitespace-nowrap`}>{t('motto1')}</div>
          <div className={`${textStyle2} font-medium text-left mb-12 leading-tight whitespace-nowrap`}>{t('motto2')}</div>
          <div className='w-[310px]'>
            <LoginButton fullWidth={true} />
          </div>
        </div>
      </div>
    </div>
  );
}