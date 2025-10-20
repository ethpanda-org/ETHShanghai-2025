'use client';

export default function PartnersSection() {
  return (
    <div className="relative z-10 mt-20 mb-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">合作伙伴</h2>
        <p className="text-gray-400">感谢我们的合作伙伴</p>
      </div>
      
      <div className="groups-content relative overflow-hidden" style={{
        width: '100%',
        height: '182.938px',
        backgroundColor: 'rgb(3, 2, 25)',
        border: '1px solid rgb(255, 255, 255)',
        borderRadius: '12px',
        position: 'relative'
      }}>
        <div className="group-line moving-left absolute top-0 left-0 w-full h-full flex items-center justify-center">
          <div className="groups-item flex items-center justify-center">
            <div className="logo-container flex items-center justify-center">
              <img 
                alt="CryptoOracle" 
                className="company-logo normal-logo h-16 w-auto mx-4 opacity-80 hover:opacity-100 transition-opacity duration-300" 
                src="https://www.cryptoracle.network/assets/1-dxbTWLu8.png"
              />
              <img 
                alt="CryptoOracle Hover" 
                className="company-logo hover-logo h-16 w-auto mx-4 opacity-0 hover:opacity-100 transition-opacity duration-300 absolute" 
                src="https://www.cryptoracle.network/assets/1-on-D4Em46xj.png"
              />
            </div>
          </div>
          
          <div className="groups-item flex items-center justify-center">
            <div className="logo-container flex items-center justify-center">
              <img 
                alt="Partner 2" 
                className="company-logo normal-logo h-16 w-auto mx-4 opacity-80 hover:opacity-100 transition-opacity duration-300" 
                src="data:image/png;base64,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"
              />
              <img 
                alt="Partner 2 Hover" 
                className="company-logo hover-logo h-16 w-auto mx-4 opacity-0 hover:opacity-100 transition-opacity duration-300 absolute" 
                src="data:image/png;base64,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"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
