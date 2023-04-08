import Utils from '@helpers/utils';
import logger from '@logger';
import Postgres from '@modules/postgres';
import MongoDB from '@modules/mongo';

const llo = logger.logMeta.bind(null, { service: 'connection' });

interface Connections {
  openedConnections: string[];
  open: (needConnections: string[]) => Promise<any>;
  close: () => Promise<void>;
}

const Connections: Connections = {
  openedConnections: [],

  open(needConnections: string[]): Promise<any> {
    return Utils.asyncForEach(needConnections, async (connection: string) => {
      try {
        if (!connection || Connections.openedConnections.find((c) => c === connection)) return Promise.resolve();

        Connections.openedConnections.push(connection);

        switch (connection) {
          case 'postgres': {
            await Postgres.connect();
            return true;
          }
          case 'mongodb': {
            await MongoDB.connect();
            return true;
          }
          default: {
            Connections.openedConnections.pop();
            return Promise.reject(new Error('Unknown service to connect to'));
          }
        }
      } catch (err: any) {
        err.connection = connection;
        throw err;
      }
    })
      .then(() => {
        logger.verbose('Connections open', llo({}));
        return true;
      })
      .catch((error) => {
        Connections.openedConnections.pop();
        logger.warn('Unable to open connections', { error });
        throw error;
      });
  },

  close(): Promise<any> {
    return Utils.asyncForEach(Connections.openedConnections, async (connection: string) => {
      switch (connection) {
        case 'postgres': {
          return Postgres.disconnect();
        }
        case 'mongodb': {
          return MongoDB.disconnect();
        }
        default: {
          return Promise.reject(new Error('Unknown service to disconnect from'));
        }
      }
    })
      .then(() => {
        Connections.openedConnections = [];
        logger.verbose('Connections closed', llo({}));
        logger.purge();
        return Utils.wait(500);
      })
      .catch((error) => {
        logger.error('Unable to close connections', llo({ error }));
        throw error;
      });
  }
};

export default Connections;
