export interface AppUserNoticeRespVO {
  busiNo: number
  title: string
  img: string
  content: string
  source: string
  readed: number
  type: number
  createTime: number
}

export interface AppTopicCatalogRespVO {
  id: number
  parentId: number
  title: string
  slug: string
  type: number
  typeId: number
  status: number
  sort: number
  path: string
  createTime: number
}
