import * as sinon from 'sinon';
import { expect } from 'chai';
import { getRandomAvatar } from '@helpers/avatar';

describe('Helpers: Avatar', () => {
  let sandbox: any = null;

  beforeEach(async () => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox && sandbox.restore();
  });

  it('Should get avatar', async () => {
    const avatar = getRandomAvatar();
    expect(avatar).exist;
  });
});

