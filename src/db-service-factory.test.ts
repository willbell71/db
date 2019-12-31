import { DBServiceFactory } from './db-service-factory';

import { IFactory } from '@willbell71/factory';
import { IDBService } from './idb-service';
import { TDBServiceEntity } from './tdb-service-entity';
import { TDBServiceValue } from './tdb-service-value';

import { ILogLine, ILogger, Logger } from '@willbell71/logger';

class DBTestService implements IDBService {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars,@typescript-eslint/no-empty-function,@typescript-eslint/no-explicit-any
  public connect(logger: ILogger, connection: string, schema: any[]): Promise<void> { return new Promise<void>((): void => {}); }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars,@typescript-eslint/no-empty-function,@typescript-eslint/no-explicit-any
  public disconnect(): Promise<void> { return new Promise<void>((): void => {}); }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public create(entityType: string): Promise<TDBServiceEntity> { return new Promise<TDBServiceEntity>((): void => {}); }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars,@typescript-eslint/no-empty-function
  public setProp(entity: TDBServiceEntity, propName: string, value?: TDBServiceValue): void {}
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public getProp(entity: TDBServiceEntity, propName: string): TDBServiceValue { return ''; }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public save(entity: TDBServiceEntity): Promise<boolean> { return new Promise<boolean>((): void => {}); }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public fetch(entityType: string, propName: string, value: TDBServiceValue): Promise<TDBServiceEntity> {
    return new Promise<TDBServiceEntity>((): void => {});
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public fetchAll(entityType: string, propName?: string, value?: TDBServiceValue): Promise<TDBServiceEntity[]> {
    return new Promise<TDBServiceEntity[]>((): void => {});
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public remove(entity: TDBServiceEntity): Promise<boolean> { return new Promise<boolean>((): void => {}); }
}

let logLineSpy: jest.Mock;
let warnLineSpy: jest.Mock;
let errorLineSpy: jest.Mock;
let assertLineSpy: jest.Mock;
let log: ILogLine;
let warn: ILogLine;
let error: ILogLine;
let assert: ILogLine;
let logger: ILogger;
let factory: IFactory<IDBService>;
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

  factory = new DBServiceFactory(logger);
  factory.registerService('test', DBTestService);
});
afterEach(() => jest.clearAllMocks());

describe('DBServiceFactory', () => {
  it('should return a registered service', () => {
    const dbService: IDBService = factory.createService('test');
    expect(dbService).toBeTruthy();
    expect(dbService instanceof DBTestService).toBeTruthy();
  });

  it('should throw and log for unknown type', () => {
    let failed: boolean = false;
    try {
      factory.createService('test2');
    } catch {
      failed = true;
    }
    expect(failed).toBeTruthy();
    expect(error.log).toHaveBeenCalledTimes(1);
  });
});
