import Request from "@/utils/request";

// get language list
export const getLanguage = (params = {}) => {
  return Request({
    url: `/app-api/system/dict-data/lang`,
    method: "get",
  });
};

// get catalog for home navigation tags
export const getCatalog = (params = {}) => {
  return Request({
    url: `/app-api/topic/catalog/home`,
    method: "get",
  });
};

// get tags next to search
export const getCatalogTags = (params = {}) => {
  return Request({
    url: `/app-api/topic/catalog/tags`,
    method: "get",
    params,
  });
};

// get sorting field information, order get sorting status
export const getTopicsDict = (type: string) => {
  return Request({
    url: `/app-api/topic/dict/get?type=${type}`,
    method: "get",
  });
};

// get header recommended topic information
export const getTopicsTop = (params = {}) => {
  return Request({
    url: "/app-api/topic/top",
    method: "post",
    data: params,
  });
};

// get user notifications
export const getTopicUserNotice = (params = {}) => {
  return Request({
    url: "/app-api/topic/user/notice",
    method: "get",
  });
};

// update notification to read status
export const readTopicUserNotice = (params = {}) => {
  return Request({
    url: "/app-api/topic/user/notice/read",
    method: "get",
  });
};

// get notice details
export const getNotice = (params = {}) => {
  return Request({
    url: "/app-api/system/common/getNotice",
    method: "get",
    params,
  });
};

// get user agreement type=TOS
export const getAgreement = (params = {}) => {
  return Request({
    url: "/app-api/cms/article/getByType",
    method: "get",
    params,
  });
};
