import * as moment from 'moment';
import { defaults, pick } from 'lodash';

interface Request {
  limit?: number;
  skip?: number;
  sort?: object;
}

interface PaginateParams {
  limit?: number;
  offset?: number;
  orderProp?: string;
  order?: string;
}

interface FilterByDateOpts {
  fromDate?: string;
  toDate?: string;
}

const ModelsUtils = {
  getter(date: any): moment.Moment {
    if (date) {
      return moment(date);
    }
    return date;
  },

  setter(date: string): string | null {
    if (!date) {
      return null;
    }

    return moment.isMoment(date) ? date.format() : moment(date).format();
  },

  requestPaginate(opts: PaginateParams = {}): Request {
    const paginateParams = pick(opts, 'limit', 'offset', 'orderProp', 'order');
    const params: any = defaults(paginateParams, { limit: 15, offset: 1, orderProp: 'createdAt', order: 'desc' });

    const request: Request = {};

    if (params.limit) {
      request.limit = parseInt(params.limit);
    }
    if (params.offset) {
      request.skip = parseInt(params.limit) * (parseInt(params.offset) - 1);
    }
    if (params.order || params.orderProp) {
      request.sort = { [params.orderProp]: params.order === 'desc' ? -1 : 1 };
    }

    return request;
  },

  requestPaginateAggregation(opts: PaginateParams = {}): object[] {
    const paginateParams = pick(opts, 'limit', 'offset', 'orderProp', 'order');
    const params: any = defaults(paginateParams, { limit: 15, offset: 1, orderProp: 'createdAt', order: 'desc' });

    const request: object[] = [];

    if (params.limit) {
      request.push({
        $limit: parseInt(params.limit)
      });
    }
    if (params.offset) {
      request.push({
        $skip: parseInt(params.limit) * (parseInt(params.offset) - 1)
      });
    }
    if (params.order || params.orderProp) {
      request.push({
        $sort: { [params.orderProp]: params.order === 'desc' ? -1 : 1 }
      });
    }

    return request;
  },

  filterByDate(opts: FilterByDateOpts = {}, prop: string): object {
    const params: any = {};

    if (opts.fromDate && !opts.toDate) {
      params[prop] = { $gte: moment(opts.fromDate).startOf('day').toDate() };
    }

    if (opts.toDate && !opts.fromDate) {
      params[prop] = { $lte: moment(opts.toDate).endOf('day').toDate() };
    }

    if (opts.toDate && opts.fromDate) {
      params[prop] = {
        $gte: moment(opts.fromDate).startOf('day').toDate(),
        $lte: moment(opts.toDate).endOf('day').toDate()
      };
    }

    return params;
  }
};

export default ModelsUtils;
