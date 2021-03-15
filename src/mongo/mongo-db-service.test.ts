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
  TestModel.findById = function(): Promise<string|undefined> {
    return new Promise((
      resolve: ((value?: string | PromiseLike<string> | undefined) => void)
    ): void => {
      resolve('findById');
    });
  };
  TestModel.findOne = function(): Promise<string|undefined> {
    return new Promise((
      resolve: ((value?: string | PromiseLike<string> | undefined) => void)
    ): void => {
      resolve('findOne');
    });
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TestModel.find = function(query?: {[key: string]: any}): Promise<string[]|undefined> {
    return new Promise((
      resolve: ((value?: string[] | PromiseLike<string[]> | undefined) => void)
    ): void => {
      return resolve(query ? ['findWith', 'findWith'] : ['findWithout', 'findWithout']);
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
import { TDBServiceEntity } from '../tdb-service-entity';

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
          mongoDBService.create('test', { test: 'test' })
            .then((entity: string) => {
              expect(entity).toBeTruthy();
              done();
            })
            .catch(() => done('Invoked catch block'));
        })
        .catch(() => done('Invoked catch block'));
    });

    it('should error if connection hasnt been called', (done: jest.DoneCallback) => {
      mongoDBService.create('test', { test: 'test' })
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
          mongoDBService.create('test2', { test: 'test' })
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
          mongoDBService.create('s', { test: 'test' })
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

  describe('fetchAll', () => {
    it('should error if connection hasnt been called', (done: jest.DoneCallback) => {
      mongoDBService.fetchAll('test', 'prop', 'value')
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
          mongoDBService.fetchAll('test2', 'prop', 'value')
            .then(() => done('Invoked then block'))
            .catch((err: Error) => {
              expect(err.message).toEqual('Model doesnt exist');
              done();
            });
        })
        .catch(() => done('Invoked catch block'));
    });

    it('should call find with prop and value if fetchAll by prop', (done: jest.DoneCallback) => {
      mongoDBService.connect(logger, 'connect', [{
        name: 'test',
        schemaDefinition: {
          test: String
        }
      }])
        .then(() => {
          mongoDBService.fetchAll('test', 'id', 'value')
            .then((entity: string[]) => {
              expect(entity).toEqual(['findWith', 'findWith']);
              done();
            })
            .catch(() => done('Invoked catch block'));
        })
        .catch(() => done('Invoked catch block'));
    });

    it('should call find with no params if fetchAll without prop', (done: jest.DoneCallback) => {
      mongoDBService.connect(logger, 'connect', [{
        name: 'test',
        schemaDefinition: {
          test: String
        }
      }])
        .then(() => {
          mongoDBService.fetchAll('test')
            .then((entity: string[]) => {
              expect(entity).toEqual(['findWithout', 'findWithout']);
              done();
            })
            .catch(() => done('Invoked catch block'));
        })
        .catch(() => done('Invoked catch block'));
    });
  });

  describe('findAll', () => {
    it('should error if connection hasnt been called', (done: jest.DoneCallback) => {
      mongoDBService.findAll('test')
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
          mongoDBService.findAll('test2')
            .then(() => done('Invoked then block'))
            .catch((err: Error) => {
              expect(err.message).toEqual('Model doesnt exist');
              done();
            });
        })
        .catch(() => done('Invoked catch block'));
    });

    it('should call logger', (done: jest.DoneCallback) => {
      mongoose.model('Test').find = (): mongoose.DocumentQuery<mongoose.Document[], mongoose.Document, {}> => {
        return {
          sort: jest.fn(),
          skip: jest.fn(),
          limit: jest.fn(),
          exec: jest.fn().mockResolvedValue([{}])
        } as unknown as mongoose.DocumentQuery<mongoose.Document[], mongoose.Document, {}>;
      };

      mongoDBService.connect(logger, 'connect', [{
        name: 'test',
        schemaDefinition: {
          test: String
        }
      }])
        .then(() => {
          mongoDBService.findAll('test')
            .then(() => {
              expect(logLineSpy).toHaveBeenCalledTimes(3);
              done();
            })
            .catch(() => done('Invoked catch block'));
        })
        .catch(() => done('Invoked catch block'));
    });

    it('should call entity model find', (done: jest.DoneCallback) => {
      const find: jest.Mock = jest.fn().mockImplementation((): mongoose.DocumentQuery<mongoose.Document[], mongoose.Document, {}> => {
        return {
          sort: jest.fn(),
          skip: jest.fn(),
          limit: jest.fn(),
          exec: jest.fn().mockResolvedValue([{}])
        } as unknown as mongoose.DocumentQuery<mongoose.Document[], mongoose.Document, {}>;
      });
      mongoose.model('Test').find = find;

      mongoDBService.connect(logger, 'connect', [{
        name: 'test',
        schemaDefinition: {
          test: String
        }
      }])
        .then(() => {
          mongoDBService.findAll('test')
            .then(() => {
              expect(find).toHaveBeenCalledTimes(1);
              expect(find).toHaveBeenCalledWith({});
              done();
            })
            .catch(() => done('Invoked catch block'));
        })
        .catch(() => done('Invoked catch block'));      
    });

    it('should ignore undefined values for search keys', (done: jest.DoneCallback) => {
      const find: jest.Mock = jest.fn().mockImplementation((): mongoose.DocumentQuery<mongoose.Document[], mongoose.Document, {}> => {
        return {
          sort: jest.fn(),
          skip: jest.fn(),
          limit: jest.fn(),
          exec: jest.fn().mockResolvedValue([{}])
        } as unknown as mongoose.DocumentQuery<mongoose.Document[], mongoose.Document, {}>;
      });
      mongoose.model('Test').find = find;

      mongoDBService.connect(logger, 'connect', [{
        name: 'test',
        schemaDefinition: {
          test: String
        }
      }])
        .then(() => {
          mongoDBService.findAll('test', {title: undefined})
            .then(() => {
              expect(find).toHaveBeenCalledTimes(1);
              expect(find).toHaveBeenCalledWith({});
              done();
            })
            .catch(() => done('Invoked catch block'));
        })
        .catch(() => done('Invoked catch block'));      
    });

    it('should add string search values', (done: jest.DoneCallback) => {
      const find: jest.Mock = jest.fn().mockImplementation((): mongoose.DocumentQuery<mongoose.Document[], mongoose.Document, {}> => {
        return {
          sort: jest.fn(),
          skip: jest.fn(),
          limit: jest.fn(),
          exec: jest.fn().mockResolvedValue([{}])
        } as unknown as mongoose.DocumentQuery<mongoose.Document[], mongoose.Document, {}>;
      });
      mongoose.model('Test').find = find;

      mongoDBService.connect(logger, 'connect', [{
        name: 'test',
        schemaDefinition: {
          test: String
        }
      }])
        .then(() => {
          mongoDBService.findAll('test', {title: 'a'})
            .then(() => {
              expect(find).toHaveBeenCalledTimes(1);
              expect(find).toHaveBeenCalledWith({title: 'a'});
              done();
            })
            .catch(() => done('Invoked catch block'));
        })
        .catch(() => done('Invoked catch block'));      
    });

    it('should add number search values', (done: jest.DoneCallback) => {
      const find: jest.Mock = jest.fn().mockImplementation((): mongoose.DocumentQuery<mongoose.Document[], mongoose.Document, {}> => {
        return {
          sort: jest.fn(),
          skip: jest.fn(),
          limit: jest.fn(),
          exec: jest.fn().mockResolvedValue([{}])
        } as unknown as mongoose.DocumentQuery<mongoose.Document[], mongoose.Document, {}>;
      });
      mongoose.model('Test').find = find;

      mongoDBService.connect(logger, 'connect', [{
        name: 'test',
        schemaDefinition: {
          test: String
        }
      }])
        .then(() => {
          mongoDBService.findAll('test', {quantity: 2})
            .then(() => {
              expect(find).toHaveBeenCalledTimes(1);
              expect(find).toHaveBeenCalledWith({quantity: 2});
              done();
            })
            .catch(() => done('Invoked catch block'));
        })
        .catch(() => done('Invoked catch block'));      
    });

    it('should add regex search values', (done: jest.DoneCallback) => {
      const find: jest.Mock = jest.fn().mockImplementation((): mongoose.DocumentQuery<mongoose.Document[], mongoose.Document, {}> => {
        return {
          sort: jest.fn(),
          skip: jest.fn(),
          limit: jest.fn(),
          exec: jest.fn().mockResolvedValue([{}])
        } as unknown as mongoose.DocumentQuery<mongoose.Document[], mongoose.Document, {}>;
      });
      mongoose.model('Test').find = find;

      mongoDBService.connect(logger, 'connect', [{
        name: 'test',
        schemaDefinition: {
          test: String
        }
      }])
        .then(() => {
          mongoDBService.findAll('test', {title: /A/i})
            .then(() => {
              expect(find).toHaveBeenCalledTimes(1);
              expect(find).toHaveBeenCalledWith({title: /A/i});
              done();
            })
            .catch(() => done('Invoked catch block'));
        })
        .catch(() => done('Invoked catch block'));      
    });

    it('should add gt values', (done: jest.DoneCallback) => {
      const find: jest.Mock = jest.fn().mockImplementation((): mongoose.DocumentQuery<mongoose.Document[], mongoose.Document, {}> => {
        return {
          sort: jest.fn(),
          skip: jest.fn(),
          limit: jest.fn(),
          exec: jest.fn().mockResolvedValue([{}])
        } as unknown as mongoose.DocumentQuery<mongoose.Document[], mongoose.Document, {}>;
      });
      mongoose.model('Test').find = find;

      mongoDBService.connect(logger, 'connect', [{
        name: 'test',
        schemaDefinition: {
          test: String
        }
      }])
        .then(() => {
          mongoDBService.findAll('test', {price: {gt: 10}})
            .then(() => {
              expect(find).toHaveBeenCalledTimes(1);
              expect(find).toHaveBeenCalledWith({price: {$gt: 10}});
              done();
            })
            .catch(() => done('Invoked catch block'));
        })
        .catch(() => done('Invoked catch block'));      
    });

    it('should add lt values', (done: jest.DoneCallback) => {
      const find: jest.Mock = jest.fn().mockImplementation((): mongoose.DocumentQuery<mongoose.Document[], mongoose.Document, {}> => {
        return {
          sort: jest.fn(),
          skip: jest.fn(),
          limit: jest.fn(),
          exec: jest.fn().mockResolvedValue([{}])
        } as unknown as mongoose.DocumentQuery<mongoose.Document[], mongoose.Document, {}>;
      });
      mongoose.model('Test').find = find;

      mongoDBService.connect(logger, 'connect', [{
        name: 'test',
        schemaDefinition: {
          test: String
        }
      }])
        .then(() => {
          mongoDBService.findAll('test', {price: {lt: 100}})
            .then(() => {
              expect(find).toHaveBeenCalledTimes(1);
              expect(find).toHaveBeenCalledWith({price: {$lt: 100}});
              done();
            })
            .catch(() => done('Invoked catch block'));
        })
        .catch(() => done('Invoked catch block'));      
    });

    it('should add gt and lt values', (done: jest.DoneCallback) => {
      const find: jest.Mock = jest.fn().mockImplementation((): mongoose.DocumentQuery<mongoose.Document[], mongoose.Document, {}> => {
        return {
          sort: jest.fn(),
          skip: jest.fn(),
          limit: jest.fn(),
          exec: jest.fn().mockResolvedValue([{}])
        } as unknown as mongoose.DocumentQuery<mongoose.Document[], mongoose.Document, {}>;
      });
      mongoose.model('Test').find = find;

      mongoDBService.connect(logger, 'connect', [{
        name: 'test',
        schemaDefinition: {
          test: String
        }
      }])
        .then(() => {
          mongoDBService.findAll('test', {price: {gt: 10, lt: 100}})
            .then(() => {
              expect(find).toHaveBeenCalledTimes(1);
              expect(find).toHaveBeenCalledWith({price: {$gt: 10, $lt: 100}});
              done();
            })
            .catch(() => done('Invoked catch block'));
        })
        .catch(() => done('Invoked catch block'));      
    });

    it('should call sort when passed', (done: jest.DoneCallback) => {
      const sort: jest.Mock = jest.fn();
      mongoose.model('Test').find = jest.fn().mockImplementation((): mongoose.DocumentQuery<mongoose.Document[], mongoose.Document, {}> => {
        return {
          sort,
          skip: jest.fn(),
          limit: jest.fn(),
          exec: jest.fn().mockResolvedValue([{}])
        } as unknown as mongoose.DocumentQuery<mongoose.Document[], mongoose.Document, {}>;
      });

      mongoDBService.connect(logger, 'connect', [{
        name: 'test',
        schemaDefinition: {
          test: String
        }
      }])
        .then(() => {
          mongoDBService.findAll('test', undefined, {title: -1})
            .then(() => {
              expect(sort).toHaveBeenCalledTimes(1);
              expect(sort).toHaveBeenCalledWith({title: -1});
              done();
            })
            .catch(() => done('Invoked catch block'));
        })
        .catch(() => done('Invoked catch block'));
    });

    it('should call skip when start passed', (done: jest.DoneCallback) => {
      const skip: jest.Mock = jest.fn();
      mongoose.model('Test').find = jest.fn().mockImplementation((): mongoose.DocumentQuery<mongoose.Document[], mongoose.Document, {}> => {
        return {
          sort: jest.fn(),
          skip,
          limit: jest.fn(),
          exec: jest.fn().mockResolvedValue([{}])
        } as unknown as mongoose.DocumentQuery<mongoose.Document[], mongoose.Document, {}>;
      });

      mongoDBService.connect(logger, 'connect', [{
        name: 'test',
        schemaDefinition: {
          test: String
        }
      }])
        .then(() => {
          mongoDBService.findAll('test', undefined, undefined, 10)
            .then(() => {
              expect(skip).toHaveBeenCalledTimes(1);
              expect(skip).toHaveBeenCalledWith(10);
              done();
            })
            .catch(() => done('Invoked catch block'));
        })
        .catch(() => done('Invoked catch block'));
    });

    it('should call limit when limit passed', (done: jest.DoneCallback) => {
      const limit: jest.Mock = jest.fn();
      mongoose.model('Test').find = jest.fn().mockImplementation((): mongoose.DocumentQuery<mongoose.Document[], mongoose.Document, {}> => {
        return {
          sort: jest.fn(),
          skip: jest.fn(),
          limit,
          exec: jest.fn().mockResolvedValue([{}])
        } as unknown as mongoose.DocumentQuery<mongoose.Document[], mongoose.Document, {}>;
      });

      mongoDBService.connect(logger, 'connect', [{
        name: 'test',
        schemaDefinition: {
          test: String
        }
      }])
        .then(() => {
          mongoDBService.findAll('test', undefined, undefined, undefined, 100)
            .then(() => {
              expect(limit).toHaveBeenCalledTimes(1);
              expect(limit).toHaveBeenCalledWith(100);
              done();
            })
            .catch(() => done('Invoked catch block'));
        })
        .catch(() => done('Invoked catch block'));
    });

    it('should call find exec', (done: jest.DoneCallback) => {
      const exec: jest.Mock = jest.fn().mockResolvedValue([{}]);
      mongoose.model('Test').find = jest.fn().mockImplementation((): mongoose.DocumentQuery<mongoose.Document[], mongoose.Document, {}> => {
        return {
          sort: jest.fn(),
          skip: jest.fn(),
          limit: jest.fn(),
          exec
        } as unknown as mongoose.DocumentQuery<mongoose.Document[], mongoose.Document, {}>;
      });

      mongoDBService.connect(logger, 'connect', [{
        name: 'test',
        schemaDefinition: {
          test: String
        }
      }])
        .then(() => {
          mongoDBService.findAll('test')
            .then(() => {
              expect(exec).toHaveBeenCalledTimes(1);
              done();
            })
            .catch(() => done('Invoked catch block'));
        })
        .catch(() => done('Invoked catch block'));      
    });

    it('should return find exec response on success', (done: jest.DoneCallback) => {
      const find: jest.Mock = jest.fn().mockImplementation((): mongoose.DocumentQuery<mongoose.Document[], mongoose.Document, {}> => {
        return {
          sort: jest.fn(),
          skip: jest.fn(),
          limit: jest.fn(),
          exec: jest.fn().mockResolvedValue([{}])
        } as unknown as mongoose.DocumentQuery<mongoose.Document[], mongoose.Document, {}>;
      });
      mongoose.model('Test').find = find;

      mongoDBService.connect(logger, 'connect', [{
        name: 'test',
        schemaDefinition: {
          test: String
        }
      }])
        .then(() => {
          mongoDBService.findAll('test')
            .then((entities: TDBServiceEntity[]) => {
              expect(entities).toEqual([{}]);
              done();
            })
            .catch(() => done('Invoked catch block'));
        })
        .catch(() => done('Invoked catch block'));      
    });
  });

  describe('remove', () => {
    it('should call entity remove', async () => {
      const entity: TDBServiceEntity = {
        remove: jest.fn()
      };

      await mongoDBService.remove(entity);

      expect(entity.remove).toHaveBeenCalledTimes(1);
    });

    it('should return true on success', async () => {
      const entity: TDBServiceEntity = {
        remove: jest.fn()
      };

      const value: boolean = await mongoDBService.remove(entity);

      expect(value).toBeTruthy();
    });
  });
});
