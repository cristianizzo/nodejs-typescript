import elastic from 'elastic-apm-node';
import config from '../../config';

const Elastic = {
  init: () => {
    if (!config.ELASTIC.APM_STATUS) {
      return;
    }
    elastic.start({
      serviceName: config.SERVICES.API.NAME,
      secretToken: config.ELASTIC.APM_SECRET_TOKEN,
      serverUrl: config.ELASTIC.APM_SERVER_URL,
      environment: config.ENVIRONMENT
    });
  }
}

export default Elastic;
