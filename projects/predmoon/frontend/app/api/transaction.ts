import Request from '@/utils/request';

export const getWithdrawSign = (params = {}) => {
  return Request({
    url: `/app-api/topic/user/getWithdrawSignData`,
    method: 'post',
    data: params,
  });
}
