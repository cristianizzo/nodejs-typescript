// import moment2 from 'sequelize';
// import moment, {Moment} from 'moment';
// import {defaults, pick} from 'lodash';
//
// interface DateGetterSetter {
//   get(): Moment | undefined;
//
//   set(val: Moment | string | undefined): void;
// }
//
// interface ModelsUtils {
//   dateGetterSetter(propName: string): DateGetterSetter;
//
//   requestPaginate(opts?: { limit?: number; offset?: number; order?: 'asc' | 'desc' }): {
//     limit?: number;
//     offset?: number;
//     order?: [string, 'ASC' | 'DESC'][];
//   };
// }
//
// const ModelsUtils: ModelsUtils = {
//   dateGetterSetter: (propName: string): DateGetterSetter => ({
//     get(): Moment | undefined {
//       const date = this.getDataValue(propName);
//
//       if (date) {
//         return moment.utc(date);
//       }
//     },
//     set(val: Moment | string | undefined): void {
//       this.setDataValue(propName, moment.isMoment(val) ? val.format() : moment.utc(val).format());
//     },
//   }),
//
//   requestPaginate(opts: { limit?: number; offset?: number; order?: 'asc' | 'desc' } = {}) {
//     const paginateParams = pick(opts, 'limit', 'offset', 'order');
//     const params = defaults(paginateParams, {limit: 10, offset: 0, order: 'desc'});
//
//     const request: { limit?: number; offset?: number; order?: [string, 'ASC' | 'DESC'][] } = {};
//
//     if (params.limit) {
//       request.limit = parseInt(params.limit.toString(), 10);
//     }
//     if (params.offset) {
//       request.offset = parseInt(params.offset.toString(), 10);
//     }
//     if (params.order) {
//       request.order = [['createdAt', params.order.toUpperCase()]]
//       as [string, 'ASC' | 'DESC'][];
//     }
//
//     return request;
//   },
// };
//
// export default ModelsUtils;


//
// const moment = require('moment');
// const { defaults, pick } = require('lodash');
//
// const ModelsUtils = {
//   dateGetterSetter: (propName) => ({
//     get() {
//       const date = this.getDataValue(propName);
//
//       if (date) {
//         return moment.utc(date);
//       }
//     },
//     set(val) {
//       return this.setDataValue(propName, moment.isMoment(val) ? val.format() : moment.utc(val).format());
//     },
//   }),
//
//   requestPaginate(opts = {}) {
//     const paginateParams = pick(opts, 'limit', 'offset', 'order');
//     const params = defaults(paginateParams, { limit: 10, offset: 0, order: 'desc' });
//
//     const request = {};
//
//     if (params.limit) {
//       request.limit = parseInt(params.limit);
//     }
//     if (params.offset) {
//       request.offset = parseInt(params.offset);
//     }
//     if (params.order) {
//       request.order = [['createdAt', params.order.toUpperCase()]];
//     }
//
//     return request;
//   },
// };
//
// module.exports = ModelsUtils;
