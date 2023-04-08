import { Document, Model } from 'mongoose'
import * as async from 'async'
import logger from '@logger'

const llo = logger.logMeta.bind(null, { service: 'modules: Crawler' })

class DBCrawler {
  private readonly model: Model<Document>
  private readonly onDocument: (document: Document, stat: { nbWorked: number; nbTotal: number }) => Promise<void>
  private readonly where: object
  private readonly stopOnError: boolean
  private readonly useAggregate: boolean
  private readonly aggregate: object[]
  private readonly select: string
  private readonly offset: number
  private readonly sort: string
  private readonly raw: boolean
  private readonly populate: string
  private readonly onError: (document: Document, error: Error) => void
  private readonly concurrency: number
  private readonly batchSize: number
  private crawling: boolean
  private isOnError: boolean
  private nbWorked: number
  private nbTotal: number
  private crawlResult: { nbSuccess: number; nbError: number; nbTotal: number }
  private readonly queue: async.AsyncQueue<Document[]>

  constructor(opts: any) {
    if (!opts.onDocument) {
      throw new Error('Need onDocument method')
    }

    if (!opts.model) {
      throw new Error('Need model to crawl')
    }

    /**
     * @description mongoose model
     * @param {model}
     * @example mongoose.model('invoice')
     */
    this.model = opts.model

    /**
     * @description mongoose model
     * @param {onDocument}
     * @example myFunction
     * @returns {Function} Returns a function with the current document
     */
    this.onDocument = opts.onDocument

    /**
     * @description where document
     * @param {where}
     * @example {name: 'goo', surname: 'baspp'}
     */
    this.where = opts.where || {}

    /**
     * @description stopOnError
     * @param {stopOnError}
     * @example true
     */
    this.stopOnError = false

    /**
     * @description useAggregate
     * @param {useAggregate}
     * @example true
     */
    this.useAggregate = opts.useAggregate || false

    /**
     * @description aggregation document
     * @param {aggregate}
     * @example [{$lookup: {from: 'subscriptions'}}]
     */
    this.aggregate = opts.aggregate || []

    /**
     * @description select document fields
     * @param {select}
     * @example '_id name surname'
     */
    this.select = opts.select || ''

    /**
     * @description set offset documents
     * @param {offset}
     * @example 100
     */
    this.offset = opts.offset || 0

    /**
     * @description sort documents
     * @param {sort}
     * @example {'created_at': -1}
     */
    this.sort = opts.sort || undefined

    /**
     * @description get raw documents
     * @param {boolean}
     * @example true
     */
    this.raw = opts.raw || false

    /**
     * @description populate document
     * @param {populate}
     * @example 'tags', '_id name'
     */
    this.populate = opts.populate || ''

    this.onError = opts.onError || DBCrawler.defaultOnError
    this.concurrency = opts.concurrency || 2
    this.batchSize = opts.batchSize || 10
    this.crawling = false
    this.isOnError = false
    this.nbWorked = 0
    this.nbTotal = 0
    this.crawlResult = { nbSuccess: 0, nbError: 0, nbTotal: 0 }

    this.queue = async.queue(this._worker.bind(this) as any, this.concurrency)
  }

  static defaultOnError(document: Document, error: Error) {
    logger.error(
      'error on db crawler',
      llo({
        error,
        documentId: document._id
      })
    )
  }

  async _fetchNext(limit = 10, offset = 0) {
    const where = this.where
    const select = this.select
    const populate = this.populate
    const useAggregate = this.useAggregate
    const aggregate = this.aggregate

    if (useAggregate) {
      const aggregateWithSkipLimit: any = [...aggregate, { $skip: offset }, { $limit: limit }]

      const response = this.model.aggregate(aggregateWithSkipLimit)

      return await response.exec()
    } else {
      let response = this.model.find(where).select(select).populate(populate).limit(limit).skip(offset)

      if (this.sort) {
        response = response.sort(this.sort)
      }

      if (this.raw) {
        response = response.lean()
      }

      return await response.exec()
    }
  }

  async _worker(document: Document) {
    this.nbWorked++

    const stat = {
      nbWorked: this.nbWorked,
      nbTotal: this.nbTotal
    }

    try {
      await this.onDocument(document, stat)
      this.crawlResult.nbSuccess++
    } catch (error: any) {
      this.onError(document, error)
      this.crawlResult.nbError++
      if (this.stopOnError) {
        this.isOnError = true
      }
    }
  }

  async crawl() {
    if (this.crawling) {
      throw new Error('Already crawling')
    }

    this.crawling = true
    const where = this.where || {}

    if (this.useAggregate) {
      const data: any = [...this.aggregate, { $count: 'count' }]
      const result = await this.model.aggregate(data)
      this.nbTotal = result && result.length > 0 ? result[0].count || 0 : 0
    } else {
      this.nbTotal = await this.model.countDocuments(where)
    }

    this.crawlResult = {
      nbSuccess: 0,
      nbError: 0,
      nbTotal: this.nbTotal
    }

    return await new Promise((resolve, reject) => {
      const limit = this.batchSize
      let offset = this.offset

      const fillQueue = async (): Promise<any> => {
        if (this.isOnError || !this.crawling) {
          resolve(this.crawlResult)
          return true
        }

        this._fetchNext(limit, offset)
          .then((items: any) => {
            if (items.length > 0) {
              // eslint-disable-next-line
              this.queue.push(items)
              offset += limit

              logger.silly(`Offset ${offset}`, llo({ offset }))
            } else {
              this.crawling = false
              resolve(this.crawlResult)
            }

            return true
          })
          .catch((error: any) => {
            reject(error)
          })
      }

      this.queue.drain(fillQueue) // eslint-disable-line
      fillQueue() // eslint-disable-line
    })
  }
}

export default DBCrawler
