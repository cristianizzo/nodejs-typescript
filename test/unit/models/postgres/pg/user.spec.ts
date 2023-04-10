import * as path from 'path'
import * as sinon from 'sinon'
import * as moment from 'moment'
import { expect } from 'chai'
import Models from '@postgresModels'
import postgres from '@modules/postgres'
import { sequelizeMockingMocha } from 'sequelize-mocking'
import { IEnumTokenType, ITokenAttribute } from '@type/db/db'

describe('Model:user', () => {
  let sandbox: any = null
  let user: any
  let requestInfo: any

  sequelizeMockingMocha(postgres.sequelize, [path.resolve('test/mocks/userRole.json'), path.resolve('test/mocks/users.json')], {
    logging: false
  })

  beforeEach(async () => {
    sandbox = sinon.createSandbox()
    user = await Models.User.findByPk('26a05507-0395-447a-bbbb-000000000000')
    requestInfo = { ip: '192.0.0.1' }
  })

  afterEach(() => {
    sandbox && sandbox.restore()
  })

  it('Should create', async () => {
    const user = await Models.User.create({
      firstName: 'Marcel',
      lastName: 'Lafrite',
      email: 'marceline@amon.tech',
      password: 'soeasy',
      isActive: true,
      verifyEmail: true
    })

    expect(user.firstName).to.eq('Marcel')
    expect(user.lastName).to.eq('Lafrite')
    expect(user.email).to.eq('marceline@amon.tech')
    expect(user.password).not.to.eq('soeasy')
    expect(user.isActive).to.eq(true)
    expect(user.verifyEmail).to.eq(true)
  })

  it('Should filterKeys', async () => {
    user.countLoginFailed = 1
    const filterUser = user.filterKeys()
    expect(Object.keys(filterUser).length).to.eq(12)
    expect(filterUser.createdAt).to.eq(moment.utc(user.createdAt).format())
  })

  it('Should set password', async () => {
    const newPassword = 'new password'
    await user.setPassword(newPassword)

    expect(await user.validPassword(newPassword)).to.be.true
  })

  it('Should set password with opts', async () => {
    const newPassword = 'new password'
    const tOpts = await postgres.transactionOptions()
    await user.setPassword(newPassword, tOpts)
    await tOpts.transaction.commit()
    expect(await user.validPassword(newPassword)).to.be.true
  })

  it('Should validate password', async () => {
    const newPassword = '5794403da3f7026107ba5d8d81f524c4d029710bd9296ff9514929c5ae96e026'
    await user.setPassword(newPassword)

    expect(await user.validPassword('5794403da3f7026107ba5d8d81f524c4d029710bd9296ff9514929c5ae96e026')).to.be.true
  })

  it('Cannot validate incorrect password', async () => {
    const newPassword = '5794403da3f7026107ba5d8d81f524c4d029710bd9296ff9514929c5ae96e026'
    await user.setPassword(newPassword)

    expect(await user.validPassword('incorrect password')).to.be.false
  })

  it('Should find by email', async () => {
    const email = user.email
    const dbUser = await Models.User.findByEmail(email)

    expect(dbUser!.id).to.eq(user.id)
  })

  it('Should find by email with transaction', async () => {
    const tOpts = await postgres.transactionOptions()
    const user = await Models.User.create(
      {
        firstName: 'Marcel',
        lastName: 'Lafrite',
        email: 'marceline@amon.tech',
        password: 'soeasy',
        isActive: true,
        verifyEmail: true
      },
      tOpts
    )
    const userGet = await Models.User.findByEmail(user.email, tOpts)

    expect(userGet!.id).to.eq(user.id)
    await tOpts.transaction.rollback()
    expect(await Models.User.findByPk(user.id)).to.be.null
  })

  describe('Token', () => {
    let tokenAuth: any
    beforeEach(async () => {
      tokenAuth = await Models.Token.createToken(user.id, 'value', IEnumTokenType.AUTH, requestInfo)
      tokenAuth = await Models.Token.createForResetPassword(user, requestInfo)
    })

    it('Should get token by type', async () => {
      const tokens = await user.getTokensByType(IEnumTokenType.RESET_PASSWORD)
      expect(tokens.length).to.eq(1)
      expect(tokens[0].type).to.eq(IEnumTokenType.RESET_PASSWORD)
    })

    it('Should remove token by type', async () => {
      await user.removeTokensByType(IEnumTokenType.RESET_PASSWORD)
      const tokens = await user.getTokensByType(IEnumTokenType.RESET_PASSWORD)
      expect(tokens.length).to.eq(0)
    })

    it('Should remove token by type with tOps', async () => {
      const tOpts = await postgres.transactionOptions()
      await user.removeTokensByType(IEnumTokenType.RESET_PASSWORD, tOpts)
      await tOpts.transaction.commit()
      const tokens = await user.getTokensByType(IEnumTokenType.RESET_PASSWORD)
      expect(tokens.length).to.eq(0)
    })

    it('Should remove token by type with tOpts', async () => {
      await user.removeTokensByType(IEnumTokenType.AUTH)

      const tOpts = await postgres.transactionOptions()

      await Models.Token.create(
        {
          value: 'auth-token',
          type: IEnumTokenType.AUTH,
          UserId: user.id
        } as ITokenAttribute,
        tOpts
      )

      await user.removeTokensByType(IEnumTokenType.AUTH, tOpts)

      const tokens = await user.getTokensByType(IEnumTokenType.AUTH, tOpts)
      expect(tokens.length).to.eq(0)

      await tOpts.transaction.rollback()
      const res = await user.getTokensByType(IEnumTokenType.AUTH)
      expect(res).to.be.deep.eq([])
    })
  })
})
