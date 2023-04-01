import toobusy from 'toobusy-js';
import logger from '../modules/logger';

export default () => {
  toobusy.maxLag(600);

  toobusy.interval(2000);

  toobusy.onLag((currentLag: number) => {
    logger.warn('too_busy', { currentLag });
  });
};
