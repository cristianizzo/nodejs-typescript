import * as sinon from 'sinon';
import { expect } from 'chai';
import config from '@config';
import Mail from '@helpers/mail';
import logger from '@modules/logger';
import { IEnumEnvironment } from '../../../src/types/config/config';
import axios from 'axios';

describe('Helpers: Mail', () => {
  let sandbox: any = null;
  let stubSendgridSend: any;
  let oldRemoteExec: boolean;
  let oldEnable: boolean;
  let oldApi: string;

  beforeEach(async () => {
    sandbox = sinon.createSandbox();

    // stubSendgridSend = sandbox.stub(Utils.axios);
    stubSendgridSend = sandbox.stub(axios, 'post').resolves();

    oldEnable = config.MAIL.SENDGRID_ENABLED;
    oldRemoteExec = config.REMOTE_EXECUTION;
    oldApi = config.MAIL.SENDGRID_API_KEY;
    config.MAIL.SENDGRID_ENABLED = true;
    config.REMOTE_EXECUTION = true;
    config.MAIL.SENDGRID_API_KEY = 'xxx';
  });

  afterEach(async () => {
    config.MAIL.SENDGRID_ENABLED = oldEnable;
    config.REMOTE_EXECUTION = oldRemoteExec;
    config.MAIL.SENDGRID_API_KEY = oldApi;
    sandbox && sandbox.restore();
  });

  it('Should _rpCall', async () => {
    stubSendgridSend.resolves();
    const fakeBody: any = {
      test: 1
    };

    await Mail._rpCall(fakeBody);

    expect(stubSendgridSend.calledOnce).to.be.true;
    expect(
      stubSendgridSend.calledWith(config.MAIL.SENDGRID_URI,
        fakeBody,
        {
          headers: {
            Authorization: `Bearer ${config.MAIL.SENDGRID_API_KEY}`
          }
        }
      )
    ).to.be.true;
  });

  it('Should send mail simple', async () => {
    const spyLog = sandbox.spy(logger, 'verbose');
    const spySend = sandbox.spy(Mail, '_send');
    const res = await Mail.send(
      {
        toEmail: 'email1',
        toName: 'name1',
        subject: 'test',
        templateId: 'xxx'
      },
      { test: 1 }
    );

    expect(spyLog.calledOnce).to.be.true;
    expect(spySend.calledOnce).to.be.true;
    expect(
      spySend.calledWith(
        {
          toEmail: 'email1',
          toName: 'name1',
          subject: 'test',
          templateId: 'xxx'
        },
        { test: 1 }
      )
    ).to.be.true;

    expect(res).to.be.true;
    expect(stubSendgridSend.calledOnce).to.be.true;
    expect(stubSendgridSend.args[0][0]).to.eq(config.MAIL.SENDGRID_URI);

    expect(stubSendgridSend.args[0][1]).to.be.deep.eq({
      content: [
        {
          type: 'text/html',
          value: '<html lang="en"></html>'
        }
      ],
      template_id: 'xxx',
      mail_settings: {
        sandbox_mode: {
          enable: false
        }
      },
      from: {
        email: config.MAIL.FROM_EMAIL,
        name: config.APP_NAME
      },
      reply_to: {
        email: config.MAIL.REPLY_EMAIL,
        name: config.APP_NAME
      },
      personalizations: [
        {
          to: [
            {
              email: 'email1',
              name: 'name1'
            }
          ],
          subject: `[local] test`,
          headers: {
            'X-Accept-Language': 'en',
            'X-Mailer': 'AgreeWe'
          },
          dynamic_template_data: {
            subject: '[local] test',
            email: 'email1',
            name: 'name1',
            env: '[local] '
          }
        }
      ]
    });
  });

  it('Should send mail with all params', async () => {
    const spyLog = sandbox.spy(logger, 'verbose');
    const spySend = sandbox.spy(Mail, '_send');

    const attachments = 'fake-attachments';
    const calEvent = 'xxx';

    const res = await Mail.send(
      {
        toEmail: 'email1',
        toName: 'name1',
        subject: 'test',
        templateId: 'templateId1',
        dynamicContent: {
          prop1: 'val1',
          prop2: 'val2'
        },
        attachments,
        calEvent
      },
      { test: 1 }
    );

    expect(spyLog.calledOnce).to.be.true;
    expect(spySend.calledOnce).to.be.true;
    expect(
      spySend.calledWith(
        {
          toEmail: 'email1',
          toName: 'name1',
          subject: 'test',
          templateId: 'templateId1',
          dynamicContent: {
            prop1: 'val1',
            prop2: 'val2'
          },
          attachments,
          calEvent
        },
        { test: 1 }
      )
    ).to.be.true;

    expect(res).to.be.true;
    expect(stubSendgridSend.calledOnce).to.be.true;

    expect(stubSendgridSend.args[0][1]).to.be.deep.eq({
      content: [
        {
          type: 'text/html',
          value: '<html lang="en"></html>'
        },
        {
          type: 'text/calendar; method=REQUEST',
          value: calEvent
        }
      ],
      template_id: `templateId1`,
      mail_settings: {
        sandbox_mode: {
          enable: false
        }
      },
      from: {
        email: config.MAIL.FROM_EMAIL,
        name: config.APP_NAME
      },
      reply_to: {
        email: config.MAIL.REPLY_EMAIL,
        name: config.APP_NAME
      },
      attachments,
      personalizations: [
        {
          to: [
            {
              email: 'email1',
              name: 'name1'
            }
          ],
          subject: `[local] test`,
          headers: {
            'X-Accept-Language': 'en',
            'X-Mailer': 'AgreeWe'
          },
          dynamic_template_data: {
            subject: '[local] test',
            email: 'email1',
            name: 'name1',
            env: '[local] ',
            prop1: 'val1',
            prop2: 'val2'
          }
        }
      ]
    });
  });

  it('Should not send mail in local', async () => {
    config.REMOTE_EXECUTION = false;

    const res = await Mail.send({
      toEmail: 'email1',
      toName: 'name1'
    });

    expect(res).to.be.false;
    expect(stubSendgridSend.callCount).to.eq(0);
  });

  it('Should add environment prefix if environment is not production', async () => {
    const oldEnv = config.ENVIRONMENT;

    config.ENVIRONMENT = IEnumEnvironment.dev;

    const res = await Mail.send({
      toEmail: 'email1',
      toName: 'name1'
    });
    expect(res).to.be.true;

    expect(stubSendgridSend.args[0][1].personalizations[0].dynamic_template_data.env).to.eq('[dev] ');

    config.ENVIRONMENT = IEnumEnvironment.prod;

    await Mail.send({
      toEmail: 'email1',
      toName: 'name1'
    });
    expect(stubSendgridSend.args[1][1].personalizations[0].dynamic_template_data.env).to.eq('');

    config.ENVIRONMENT = oldEnv;
  });

  it('Should catch error', async () => {
    const opts = {
      toEmail: 'email',
      toName: 'name'
    };

    const stubLogger = sandbox.stub(logger, 'error');
    stubSendgridSend.rejects(new Error('fake-error'));

    const response = await Mail.send(opts);
    expect(response).be.false;

    expect(stubLogger.calledOnce).to.be.true;
    expect(stubLogger.calledWith('Failed to send mail')).to.be.true;
  });

  it('Should not sent if sendgrid disabled', async () => {
    const oldEnv = config.MAIL.SENDGRID_ENABLED;
    config.MAIL.SENDGRID_ENABLED = false;

    const opts = {
      toEmail: 'email',
      toName: 'name'
    };

    const spySend = sandbox.spy(Mail, '_send');

    await Mail.send(opts);

    expect(spySend.notCalled).to.be.true;
    config.MAIL.SENDGRID_ENABLED = oldEnv;
  });
});
