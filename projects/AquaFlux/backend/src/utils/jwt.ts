import jwt, { SignOptions } from 'jsonwebtoken';
import { JwtPayload } from '../types/express';
import { config } from '../config';

/**
 * 签发JWT令牌
 * @param payload 需要编码到令牌中的数据
 * @param expiresIn 过期时间（例如：'1d', '2h', '7d'），默认为配置文件中的设置
 * @returns 签名后的JWT令牌
 */
export const signJwt = (payload: JwtPayload, expiresIn: SignOptions['expiresIn'] = config.jwt.expiresIn): string => {
  const options: SignOptions = {
    expiresIn,
  };
  return jwt.sign(payload, config.jwt.secret, options);
};

/**
 * 验证JWT令牌
 * @param token JWT令牌
 * @returns 解码后的数据，如果令牌无效则抛出异常
 */
export const verifyJwt = (token: string): JwtPayload => {
  try {
    return jwt.verify(token, config.jwt.secret) as JwtPayload;
  } catch (error) {
    // 为安全起见，不暴露具体错误，统一返回一个通用错误信息
    throw new Error('无效的或已过期的令牌');
  }
};
