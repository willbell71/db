let connected: boolean = false;
jest.mock('mongoose', () => {
  const connect: jest.Mock = jest.fn().mockImplementation((connection: string) => {
    return new Promise((
      resolve: ((value?: string | PromiseLike<string> | undefined) => void),
      reject: ((reason?: string) => void)
    ): void => {
      if (connection) {
        connected = true;
        resolve('');
      } else {
        connected = false;
        reject('');
      }
    });
  });

  const disconnect: jest.Mock = jest.fn().mockImplementation((): Promise<void> => 
    connected ? Promise.resolve() : Promise.reject({message: ''}));
  
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  function TestModel(): void {}
  TestModel.findById = function(): Promise<string> {
    return new Promise((
      resolve: ((value?: string | PromiseLike<string> | undefined) => void)
    ): void => {
      resolve('findById');
    });
  };
  TestModel.findOne = function(): Promise<string> {
    return new Promise((
      resolve: ((value?: string | PromiseLike<string> | undefined) => void)
    ): void => {
      resolve('findOne');
    });
  };
  const model: jest.Mock = jest.fn().mockImplementation((name: string) => name.length > 1 ? TestModel : undefined);
  const Schema: jest.Mock = jest.fn().mockImplementation(() => {});
  const Model: jest.Mock = jest.fn().mockImplementation(() => {});
  
  return {
    connect,
    disconnect,
    model,
    Schema,
    Model
  };
});
import * as mongoose from 'mongoose';

import { ILogger, ILogLine, Logger } from '@willbell71/logger';
import { MongoDBService } from './mongo-db-service';

let logLineSpy: jest.Mock;
let warnLineSpy: jest.Mock;
let errorLineSpy: jest.Mock;
let assertLineSpy: jest.Mock;
let log: ILogLine;
let warn: ILogLine;
let error: ILogLine;
let assert: ILogLine;
let logger: ILogger;
let mongoDBService: MongoDBService;
beforeEach(() => {
  logLineSpy = jest.fn().mockImplementation(() => {});
  warnLineSpy = jest.fn().mockImplementation(() => {});
  errorLineSpy = jest.fn().mockImplementation(() => {});
  assertLineSpy = jest.fn().mockImplementation(() => {});

  log = {log: logLineSpy};
  warn = {log: warnLineSpy};
  error = {log: errorLineSpy};
  assert = {log: assertLineSpy};
  logger = new Logger(log, warn, error, assert);

  mongoDBService = new MongoDBService();
});
afterEach(() => jest.clearAllMocks());

describe('MongoDBService', () => {
  describe('connect', () => {
    it('should call mongoose connect', (done: jest.DoneCallback) => {
      mongoDBService.connect(logger, 'connect', [{
        name: 'test',
        schemaDefinition: {
          test: String
        }
      }])
        .then(() => {
          expect(mongoose.connect).toHaveBeenCalled();
          done();
        })
        .catch(() => done('Invoked catch block'));
    });

    it('should log log on successful connect', (done: jest.DoneCallback) => {
      mongoDBService.connect(logger, 'connect', [{
        name: 'test',
        schemaDefinition: {
          test: String
        }
      }])
        .then(() => {
          expect(logLineSpy).toHaveBeenCalled();
          done();
        })
        .catch(() => done('Invoked catch block'));
    });

    it('should log error on failed connect', (done: jest.DoneCallback) => {
      mongoDBService.connect(logger, '', [{
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

    it('should call mongoose Schema for each entity', (done: jest.DoneCallback) => {
      mongoDBService.connect(logger, 'connect', [{
        name: 'test',
        schemaDefinition: {
          test: String
        }
      }])
        .then(() => {
          expect(mongoose.Schema).toHaveBeenCalledTimes(1);
          done();
        })
        .catch(() => done('Invoked catch block'));
    });

    it('should call mongoose Model for each entity', (done: jest.DoneCallback) => {
      mongoDBService.connect(logger, 'connect', [{
        name: 'test',
        schemaDefinition: {
          test: String
        }
      }])
        .then(() => {
          expect(mongoose.model).toHaveBeenCalledTimes(1);
          done();
        })
        .catch(() => done('Invoked catch block'));
    });
  });

  describe('disconnect', () => {
    it('should call mongoose disconnect', (done: jest.DoneCallback) => {
      mongoDBService
        .connect(logger, 'connect', [])
        .then(() => {
          mongoDBService.disconnect()
            .then(() => {
              expect(mongoose.disconnect).toHaveBeenCalled();
              done();
            })
            .catch(() => done('Invoked disconnect catch block'));
        })
        .catch(() => done('Invoked connect catch block'));
    });

    it('should call log on successful disconnect', (done: jest.DoneCallback) => {
      mongoDBService
        .connect(logger, 'connect', [])
        .then(() => {
          mongoDBService.disconnect()
            .then(() => {
              expect(logLineSpy).toHaveBeenCalled();
              done();
            })
            .catch(() => done('Invoked disconnect catch block'));
        })
        .catch(() => done('Invoked connect catch block'));
    });

    it('should call error on unsuccessful disconnect', (done: jest.DoneCallback) => {
      mongoDBService
        .connect(logger, 'connect', [])
        .then(() => {
          connected = false;
          mongoDBService.disconnect()
            .then(() => {
              expect(errorLineSpy).toHaveBeenCalled();
              done();
            })
            .catch(() => done('Invoked disconnect catch block'));
        })
        .catch(() => done('Invoked connect catch block'));
    });

    it('should pass successful disconnect with no logger', (done: jest.DoneCallback) => {
      connected = true;
      mongoDBService.disconnect()
        .then(() => {
          done();
        })
        .catch(() => {
          done('Invoked disconnect catch block');
        });
    });

    it('should pass unsuccessful disconnect with no logger', (done: jest.DoneCallback) => {
      connected = false;
      mongoDBService.disconnect()
        .then(() => {
          done();
        })
        .catch(() => {
          done('Invoked disconnect catch block');
        });
    });
  });

  describe('create', () => {
    it('should instance new entity', (done: jest.DoneCallback) => {
      mongoDBService.connect(logger, 'connect', [{
        name: 'test',
        schemaDefinition: {
          test: String
        }
      }])
        .then(() => {
          mongoDBService.create('test')
            .then((entity: string) => {
              expect(entity).toBeTruthy();
              done();
            })
            .catch(() => done('Invoked catch block'));
        })
        .catch(() => done('Invoked catch block'));
    });

    it('should error if connection hasnt been called', (done: jest.DoneCallback) => {
      mongoDBService.create('test')
        .then(() => done('Invoked then block'))
        .catch((err: Error) => {
          expect(err.message).toEqual('Mappings not set, connection must be called with a schema for this entity');
          done();
        });
    });

    it('should error if entity doesnt exist', (done: jest.DoneCallback) => {
      mongoDBService.connect(logger, 'connect', [{
        name: 'test',
        schemaDefinition: {
          test: String
        }
      }])
        .then(() => {
          mongoDBService.create('test2')
            .then(() => done('Invoked then block'))
            .catch((err: Error) => {
              expect(err.message).toEqual('Model doesnt exist');
              done();
            });
        })
        .catch(() => done('Invoked catch block'));
    });

    it('should error if entity doesnt exist', (done: jest.DoneCallback) => {
      mongoDBService.connect(logger, 'connect', [{
        name: 's',
        schemaDefinition: {
          test: String
        }
      }])
        .then(() => {
          mongoDBService.create('s')
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
      mongoDBService.setProp(entity, 'prop', 'value');

      expect(entity.prop).toEqual('value');
    });
  });

  describe('getProp', () => {
    it('should get prop value', () => {
      const entity: {prop: string} = {
        prop: 'value'
      };

      const value: string = mongoDBService.getProp(entity, 'prop') as string;

      expect(value).toEqual('value');
    });
  });

  describe('save', () => {
    it('should call entity save', (done: jest.DoneCallback) => {
      const saveMock: jest.Mock = jest.fn().mockImplementation(() => {
        return new Promise<void>((
          resolve: ((value?: void | PromiseLike<void> | undefined) => void)
        ): void => resolve());
      });
      mongoDBService.save({
        save: saveMock
      })
        .then(() => {
          expect(saveMock).toHaveBeenCalledTimes(1);
          done();
        })
        .catch(() => done('Invoked catch block'));
    });

    it('should throw error if save fails', (done: jest.DoneCallback) => {
      const saveMock: jest.Mock = jest.fn().mockImplementation(() => {
        return new Promise<void>((
          resolve: ((value?: void | PromiseLike<void> | undefined) => void),
          reject: ((reason?: Error) => void)
        ): void => reject());
      });
      mongoDBService.save({
        save: saveMock
      })
        .then(() => done('Invoked then block'))
        .catch(() => done());
    });
  });

  describe('fetch', () => {
    it('should error if connection hasnt been called', (done: jest.DoneCallback) => {
      mongoDBService.fetch('test', 'prop', 'value')
        .then(() => done('Invoked then block'))
        .catch((err: Error) => {
          expect(err.message).toEqual('Mappings not set, connection must be called with a schema for this entity');
          done();
        });
    });
    
    it('should fail if entity doesnt exist', (done: jest.DoneCallback) => {
      mongoDBService.connect(logger, 'connect', [{
        name: 'test',
        schemaDefinition: {
          test: String
        }
      }])
        .then(() => {
          mongoDBService.fetch('test2', 'prop', 'value')
            .then(() => done('Invoked then block'))
            .catch((err: Error) => {
              expect(err.message).toEqual('Model doesnt exist');
              done();
            });
        })
        .catch(() => done('Invoked catch block'));
    });

    it('should call findById if fetch by id', (done: jest.DoneCallback) => {
      mongoDBService.connect(logger, 'connect', [{
        name: 'test',
        schemaDefinition: {
          test: String
        }
      }])
        .then(() => {
          mongoDBService.fetch('test', 'id', 'value')
            .then((entity: string) => {
              expect(entity).toEqual('findById');
              done();
            })
            .catch(() => done('Invoked catch block'));
        })
        .catch(() => done('Invoked catch block'));
    });

    it('should call findOne if fetch by other props', (done: jest.DoneCallback) => {
      mongoDBService.connect(logger, 'connect', [{
        name: 'test',
        schemaDefinition: {
          test: String
        }
      }])
        .then(() => {
          mongoDBService.fetch('test', 'prop', 'value')
            .then((entity: string) => {
              expect(entity).toEqual('findOne');
              done();
            })
            .catch(() => done('Invoked catch block'));
        })
        .catch(() => done('Invoked catch block'));
    });
  });
});
