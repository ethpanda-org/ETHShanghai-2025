
pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/comparators.circom";

template KYCVerification() {
    // 私密输入
    signal input actualAge;
    signal input actualCountry;
    signal input kycLevel;
    
    // 公共输入
    signal input minAge;
    signal input allowedCountry;
    signal input minKycLevel;
    
    // 输出
    signal output isKYCCompliant;
    
    // 年龄检查
    component ageCheck = GreaterEqThan(8);
    ageCheck.in[0] <== actualAge;
    ageCheck.in[1] <== minAge;
    
    // 国家检查 (0 表示不限制国家)
    component countryCheck = IsEqual();
    countryCheck.in[0] <== actualCountry;
    countryCheck.in[1] <== allowedCountry;
    
    component allowAllCountries = IsZero();
    allowAllCountries.in <== allowedCountry;
    
    signal countryPass;
    countryPass <== countryCheck.out + allowAllCountries.out;
    
    // KYC等级检查
    component kycLevelCheck = GreaterEqThan(8);
    kycLevelCheck.in[0] <== kycLevel;
    kycLevelCheck.in[1] <== minKycLevel;
    
    // 组合结果
    signal ageAndCountry;
    ageAndCountry <== ageCheck.out * countryPass;
    isKYCCompliant <== ageAndCountry * kycLevelCheck.out;
}
