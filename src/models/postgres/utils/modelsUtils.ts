import * as moment from 'moment'
import { defaults, pick } from 'lodash'

interface DateGetterSetter {
  get: (this: any) => moment.Moment

  set: (this: any, val: moment.Moment) => void
}

interface IPaginateRequest {
  limit?: number
  offset?: number
  order?: 'asc' | 'desc'
}

const ModelsUtils = {
  dateGetterSetter: (propName: string): DateGetterSetter => ({
    get() {
      const date: any = this.getDataValue(propName)

      if (date) {
        return moment.utc(date)
      }

      return date
    },
    set(val: any) {
      return this.setDataValue(propName, moment.isMoment(val) ? val.format() : moment.utc(val).format())
    }
  }),

  requestPaginate(opts = {}): IPaginateRequest {
    const paginateParams = pick(opts, 'limit', 'offset', 'order')
    const params: any = defaults(paginateParams, { limit: 10, offset: 0, order: 'desc' })

    const request: any = {}

    if (params.limit) {
      request.limit = parseInt(params.limit)
    }
    if (params.offset) {
      request.offset = parseInt(params.offset)
    }
    if (params.order) {
      request.order = [['createdAt', params.order.toUpperCase()]]
    }

    return request
  }
}

export default ModelsUtils
