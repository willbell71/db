import { Op } from 'sequelize';
import { ILogger, ILogLine, Logger } from '@willbell71/logger';

import { SequelizeDBService } from './sequelize-db-service';
import { TDBServiceEntity } from '../tdb-service-entity';

let connected: boolean;
const findAllMock: jest.Mock =
  jest.fn().mockImplementation((query: Record<string, unknown>) => query ? ['findWith', 'findWith'] : ['findWithout', 'findWithout']);
const defineMock: jest.Mock = jest.fn().mockImplementation((name: string) => {
  return {
    create: (values: Record<string, unknown>): Promise<any> => name.length > 1 ? Promise.resolve({...values}) : Promise.reject(),
    findOne: (): any => 'findOne',
    findAll: findAllMock
  };
});
const syncMock: jest.Mock =
  jest.fn().mockImplementation((connection: string) => connection ? Promise.resolve(true) : Promise.reject(new Error('')) );
const authenticateMock: jest.Mock = jest.fn().mockImplementation(() => {
  connected = true;
  return Promise.resolve(true);
});
const closeMock: jest.Mock = jest.fn().mockImplementation(() => connected ? Promise.resolve() : Promise.reject(new Error('')));
jest.mock('sequelize', () => {
  const sequelize: any = jest.requireActual('sequelize');

  return {
    ...sequelize,
    Sequelize: class {
      private connection?: string;
      public constructor(connection: string) { this.connection = connection; }
      public define(name: string): any { return defineMock(name); }
      public sync(): Promise<void> { return syncMock(this.connection); }
      public authenticate(): Promise<void> { return authenticateMock(); }
      public close(): Promise<void> { return closeMock(); }
    }
  };
});

let logLineSpy: jest.Mock;
let warnLineSpy: jest.Mock;
let errorLineSpy: jest.Mock;
let assertLineSpy: jest.Mock;
let log: ILogLine;
let warn: ILogLine;
let error: ILogLine;
let assert: ILogLine;
let logger: ILogger;
let sequelizeDBService: SequelizeDBService;
beforeEach(() => {
  connected = false;

  logLineSpy = jest.fn().mockImplementation(() => {});
  warnLineSpy = jest.fn().mockImplementation(() => {});
  errorLineSpy = jest.fn().mockImplementation(() => {});
  assertLineSpy = jest.fn().mockImplementation(() => {});

  log = {log: logLineSpy};
  warn = {log: warnLineSpy};
  error = {log: errorLineSpy};
  assert = {log: assertLineSpy};
  logger = new Logger(log, warn, error, assert);

  sequelizeDBService = new SequelizeDBService();
});
afterEach(() => jest.clearAllMocks());

describe('SequelizeDBService', () => {
  describe('connect', () => {
    it('should call sync', async () => {
      await sequelizeDBService.connect(logger, 'connect', [{
        name: 'test',
        schemaDefinition: {
          test: String
        }
      }]);

      expect(syncMock).toHaveBeenCalled();
    });

    it('should call authenticate', async () => {
      await sequelizeDBService.connect(logger, 'connect', [{
        name: 'test',
        schemaDefinition: {
          test: String
        }
      }]);

      expect(authenticateMock).toHaveBeenCalled();
    });

    it('should log log on successful connect', async () => {
      await sequelizeDBService.connect(logger, 'connect', [{
        name: 'test',
        schemaDefinition: {
          test: String
        }
      }]);

      expect(logLineSpy).toHaveBeenCalled();
    });

    it('should log error on failed connect', (done: jest.DoneCallback) => {
      sequelizeDBService.connect(logger, '', [{
        name: 'test',
        schemaDefinition: {
          test: String
        }
      }]);

      setTimeout(() => {
        expect(errorLineSpy).toHaveBeenCalledTimes(2);
        done();
      }, 4000);
    });

    it('should call define for each entity', async () => {
      await sequelizeDBService.connect(logger, 'connect', [{
        name: 'test',
        schemaDefinition: {
          test: String
        }
      }]);

      expect(defineMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('disconnect', () => {
    it('should call close', async () => {
      await sequelizeDBService.connect(logger, 'connect', []);

      await sequelizeDBService.disconnect();

      expect(closeMock).toHaveBeenCalled();
    });

    it('should call log on successful disconnect', async () => {
      await sequelizeDBService.connect(logger, 'connect', []);

      await sequelizeDBService.disconnect();

      expect(logLineSpy).toHaveBeenCalled();
    });

    it('should call error on unsuccessful disconnect', async () => {
      await sequelizeDBService.connect(logger, 'connect', []);

      connected = false;

      await sequelizeDBService.disconnect();

      expect(errorLineSpy).toHaveBeenCalled();
    });

    it('should pass successful disconnect with no logger', (done: jest.DoneCallback) => {
      connected = true;
      sequelizeDBService.disconnect()
        .then(() => {
          done();
        })
        .catch(() => {
          done('Invoked disconnect catch block');
        });
    });

    it('should pass unsuccessful disconnect with no logger', (done: jest.DoneCallback) => {
      connected = false;

      sequelizeDBService.disconnect()
        .then(() => {
          done();
        })
        .catch(() => {
          done('Invoked disconnect catch block');
        });
    });
  });

  describe('create', () => {
    it('should instance new entity', async () => {
      await sequelizeDBService.connect(logger, 'connect', [{
        name: 'test',
        schemaDefinition: {
          test: String
        }
      }]);
      const entity: string = await sequelizeDBService.create('test', { test: 'Test' });

      expect(entity).toBeTruthy();
    });

    it('should error if connection hasnt been called', (done: jest.DoneCallback) => {
      sequelizeDBService.create('test', { test: 'Test' })
        .then(() => done('Invoked then block'))
        .catch((err: Error) => {
          expect(err.message).toEqual('Mappings not set, connection must be called with a schema for this entity');
          done();
        });
    });

    it('should error if entity doesnt exist', (done: jest.DoneCallback) => {
      sequelizeDBService.connect(logger, 'connect', [{
        name: 'test',
        schemaDefinition: {
          test: String
        }
      }])
        .then(() => {
          sequelizeDBService.create('test2', { test: 'Test' })
            .then(() => done('Invoked then block'))
            .catch((err: Error) => {
              expect(err.message).toEqual('Model doesnt exist');
              done();
            });
        })
        .catch(() => done('Invoked catch block'));
    });

    it('should error if entity doesnt exist', (done: jest.DoneCallback) => {
      sequelizeDBService.connect(logger, 'connect', [{
        name: 's',
        schemaDefinition: {
          test: String
        }
      }])
        .then(() => {
          sequelizeDBService.create('s', { test: 'Test' })
            .then(() => done('Invoked then block'))
            .catch((err: Error) => {
              expect(err.message).toEqual('Failed to instantiate new entity');
              done();
            });
        })
        .catch(() => done('Invoked catch block'));
    });
  });

  describe('setProp', () => {
    it('should set prop value', () => {
      const entity: {prop?: string} = {};
      sequelizeDBService.setProp(entity, 'prop', 'value');

      expect(entity.prop).toEqual('value');
    });
  });

  describe('getProp', () => {
    it('should get prop value', () => {
      const entity: {prop: string} = {
        prop: 'value'
      };

      const value: string = sequelizeDBService.getProp(entity, 'prop') as string;

      expect(value).toEqual('value');
    });
  });

  describe('save', () => {
    it('should call entity save', async () => {
      const saveMock: jest.Mock = jest.fn().mockImplementation(() => {
        return new Promise<void>((
          resolve: ((value?: void | PromiseLike<void> | undefined) => void)
        ): void => resolve());
      });

      await sequelizeDBService.save({
        save: saveMock
      });

      expect(saveMock).toHaveBeenCalledTimes(1);
    });

    it('should throw error if save fails', (done: jest.DoneCallback) => {
      const saveMock: jest.Mock = jest.fn().mockImplementation(() => {
        return new Promise<void>((
          resolve: ((value?: void | PromiseLike<void> | undefined) => void),
          reject: ((reason?: Error) => void)
        ): void => reject());
      });
      sequelizeDBService.save({
        save: saveMock
      })
        .then(() => done('Invoked then block'))
        .catch(() => done());
    });
  });

  describe('fetch', () => {
    it('should error if connection hasnt been called', (done: jest.DoneCallback) => {
      sequelizeDBService.fetch('test', 'prop', 'value')
        .then(() => done('Invoked then block'))
        .catch((err: Error) => {
          expect(err.message).toEqual('Mappings not set, connection must be called with a schema for this entity');
          done();
        });
    });

    it('should fail if entity doesnt exist', (done: jest.DoneCallback) => {
      sequelizeDBService.connect(logger, 'connect', [{
        name: 'test',
        schemaDefinition: {
          test: String
        }
      }])
        .then(() => {
          sequelizeDBService.fetch('test2', 'prop', 'value')
            .then(() => done('Invoked then block'))
            .catch((err: Error) => {
              expect(err.message).toEqual('Model doesnt exist');
              done();
            });
        })
        .catch(() => done('Invoked catch block'));
    });

    it('should call findOne if fetch by other props', async () => {
      await sequelizeDBService.connect(logger, 'connect', [{
        name: 'test',
        schemaDefinition: {
          test: String
        }
      }]);

      const entity: any = await sequelizeDBService.fetch('test', 'prop', 'value');

      expect(entity).toEqual('findOne');
    });
  });

  describe('fetchAll', () => {
    it('should error if connection hasnt been called', (done: jest.DoneCallback) => {
      sequelizeDBService.fetchAll('test', 'prop', 'value')
        .then(() => done('Invoked then block'))
        .catch((err: Error) => {
          expect(err.message).toEqual('Mappings not set, connection must be called with a schema for this entity');
          done();
        });
    });

    it('should fail if entity doesnt exist', (done: jest.DoneCallback) => {
      sequelizeDBService.connect(logger, 'connect', [{
        name: 'test',
        schemaDefinition: {
          test: String
        }
      }])
        .then(() => {
          sequelizeDBService.fetchAll('test2', 'prop', 'value')
            .then(() => done('Invoked then block'))
            .catch((err: Error) => {
              expect(err.message).toEqual('Model doesnt exist');
              done();
            });
        })
        .catch(() => done('Invoked catch block'));
    });

    it('should call find with prop and value if fetchAll by prop', async () => {
      await sequelizeDBService.connect(logger, 'connect', [{
        name: 'test',
        schemaDefinition: {
          test: String
        }
      }]);

      const entity: any[] = await sequelizeDBService.fetchAll('test', 'id', 'value');

      expect(entity).toEqual(['findWith', 'findWith']);
    });

    it('should call find with no params if fetchAll without prop', async () => {
      await sequelizeDBService.connect(logger, 'connect', [{
        name: 'test',
        schemaDefinition: {
          test: String
        }
      }]);

      const entity: any[] = await sequelizeDBService.fetchAll('test');

      expect(entity).toEqual(['findWithout', 'findWithout']);
    });
  });

  describe('findAll', () => {
    it('should error if connection hasnt been called', (done: jest.DoneCallback) => {
      sequelizeDBService.findAll('test')
        .then(() => done('Invoked then block'))
        .catch((err: Error) => {
          expect(err.message).toEqual('Mappings not set, connection must be called with a schema for this entity');
          done();
        });
    });

    it('should fail if entity doesnt exist', (done: jest.DoneCallback) => {
      sequelizeDBService.connect(logger, 'connect', [{
        name: 'test',
        schemaDefinition: {
          test: String
        }
      }])
        .then(() => {
          sequelizeDBService.findAll('test2')
            .then(() => done('Invoked then block'))
            .catch((err: Error) => {
              expect(err.message).toEqual('Model doesnt exist');
              done();
            });
        })
        .catch(() => done('Invoked catch block'));
    });

    it('should call logger', async () => {
      await sequelizeDBService.connect(logger, 'connect', [{
        name: 'test',
        schemaDefinition: {
          test: String
        }
      }]);

      sequelizeDBService.findAll('test');

      expect(logLineSpy).toHaveBeenCalledTimes(3);
    });

    it('should call entity model find', async () => {
      await sequelizeDBService.connect(logger, 'connect', [{
        name: 'test',
        schemaDefinition: {
          test: String
        }
      }]);

      await sequelizeDBService.findAll('test');

      expect(findAllMock).toHaveBeenCalledTimes(1);
      expect(findAllMock).toHaveBeenCalledWith({});
    });

    it('should ignore undefined values for search keys', async () => {
      await sequelizeDBService.connect(logger, 'connect', [{
        name: 'test',
        schemaDefinition: {
          test: String
        }
      }]);

      await sequelizeDBService.findAll('test', {title: undefined});

      expect(findAllMock).toHaveBeenCalledTimes(1);
      expect(findAllMock).toHaveBeenCalledWith({});
    });

    it('should add string search values', async () => {
      await sequelizeDBService.connect(logger, 'connect', [{
        name: 'test',
        schemaDefinition: {
          test: String
        }
      }]);

      await sequelizeDBService.findAll('test', {title: 'a'});

      expect(findAllMock).toHaveBeenCalledTimes(1);
      expect(findAllMock).toHaveBeenCalledWith({ where: { [Op.and]: [{ title: 'a' }] } });
    });

    it('should add number search values', async () => {
      await sequelizeDBService.connect(logger, 'connect', [{
        name: 'test',
        schemaDefinition: {
          test: String
        }
      }]);

      await sequelizeDBService.findAll('test', {quantity: 2});

      expect(findAllMock).toHaveBeenCalledTimes(1);
      expect(findAllMock).toHaveBeenCalledWith({where: { [Op.and]: [{ quantity: 2 }]}});
    });

    it('should add regex search values', async () => {
      await sequelizeDBService.connect(logger, 'connect', [{
        name: 'test',
        schemaDefinition: {
          test: String
        }
      }]);

      await sequelizeDBService.findAll('test', {title: /A/i});

      expect(findAllMock).toHaveBeenCalledTimes(1);
      expect(findAllMock).toHaveBeenCalledWith({where: { [Op.and]: [{title: /A/i}]}});
    });

    it('should add gt values', async () => {
      await sequelizeDBService.connect(logger, 'connect', [{
        name: 'test',
        schemaDefinition: {
          test: String
        }
      }]);

      await sequelizeDBService.findAll('test', {price: {gt: 10}});

      expect(findAllMock).toHaveBeenCalledTimes(1);
      expect(findAllMock).toHaveBeenCalledWith({where: { [Op.and]: [{ price: {[Op.gt]: 10}}]}});
    });

    it('should add lt values', async () => {
      await sequelizeDBService.connect(logger, 'connect', [{
        name: 'test',
        schemaDefinition: {
          test: String
        }
      }]);

      await sequelizeDBService.findAll('test', {price: {lt: 100}});

      expect(findAllMock).toHaveBeenCalledTimes(1);
      expect(findAllMock).toHaveBeenCalledWith({where: { [Op.and]: [{price: {[Op.lt]: 100}}]}});
    });

    it('should add gt and lt values', async () => {
      await sequelizeDBService.connect(logger, 'connect', [{
        name: 'test',
        schemaDefinition: {
          test: String
        }
      }]);

      await sequelizeDBService.findAll('test', {price: {gt: 10, lt: 100}});

      expect(findAllMock).toHaveBeenCalledTimes(1);
      expect(findAllMock).toHaveBeenCalledWith({where: { [Op.and]: [{ price: {[Op.between]: [10, 100]}}]}});
    });

    it('should call sort when passed', async () => {
      await sequelizeDBService.connect(logger, 'connect', [{
        name: 'test',
        schemaDefinition: {
          test: String
        }
      }]);

      await sequelizeDBService.findAll('test', undefined, {title: -1});

      expect(findAllMock).toHaveBeenCalledTimes(1);
      expect(findAllMock).toHaveBeenCalledWith({
        order: [
          'title',
          'DESC'
        ]
      });
    });

    it('should call skip when start passed', async () => {
      await sequelizeDBService.connect(logger, 'connect', [{
        name: 'test',
        schemaDefinition: {
          test: String
        }
      }]);

      await sequelizeDBService.findAll('test', undefined, undefined, 10);

      expect(findAllMock).toHaveBeenCalledTimes(1);
      expect(findAllMock).toHaveBeenCalledWith({offset: 10});
    });

    it('should call limit when limit passed', async () => {
      await sequelizeDBService.connect(logger, 'connect', [{
        name: 'test',
        schemaDefinition: {
          test: String
        }
      }]);

      await sequelizeDBService.findAll('test', undefined, undefined, undefined, 100);

      expect(findAllMock).toHaveBeenCalledTimes(1);
      expect(findAllMock).toHaveBeenCalledWith({limit: 100});
    });

    it('should return findAll response on success', async () => {
      await sequelizeDBService.connect(logger, 'connect', [{
        name: 'test',
        schemaDefinition: {
          test: String
        }
      }]);

      const entities: TDBServiceEntity[] = await sequelizeDBService.findAll('test');

      expect(entities).toEqual(['findWith', 'findWith']);
    });
  });

  describe('remove', () => {
    it('should call entity remove', async () => {
      const entity: TDBServiceEntity = {
        destroy: jest.fn().mockResolvedValue(true)
      };

      await sequelizeDBService.remove(entity);

      expect(entity.destroy).toHaveBeenCalledTimes(1);
    });

    it('should return true on success', async () => {
      const entity: TDBServiceEntity = {
        destroy: jest.fn().mockResolvedValue(true)
      };

      const value: boolean = await sequelizeDBService.remove(entity);

      expect(value).toBeTruthy();
    });
  });
});
