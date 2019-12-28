import { IFactory, TFactoryServices } from '@willbell71/factory';
import { ILogger } from '@willbell71/logger';
import { IDBService } from './idb-service';

/**
 * DB service factory.
 */
export class DBServiceFactory implements IFactory<IDBService> {
  // logger
  private logger: ILogger;
  // registered services
  private services: TFactoryServices<IDBService> = {};

  /**
   * Constructor.
   * @param {ILogger} logger - logger service.
   */
  public constructor(logger: ILogger) {
    this.logger = logger;
  }

  /**
   * Register a service with the factory.
   * @param {string} type - type to register service as.
   * @param {{new(): IDBService}} service - service to register for name.
   */
  public registerService(type: string, service: {new(): IDBService}): void {
    this.services[type] = service;
  }

  /**
   * Return a service based on type.
   * @param {string} type - type of service to return.
   * @return {IDBService} service.
   */
  public createService(type: string): IDBService {
    const service: {new(): IDBService} = this.services[type];
    if (!service) {
      this.logger.error(`Unhandled db service type - ${type}`);
      throw (new Error(`Unhandled db service type - ${type}`));
    }
    return new service();
  }
}
