import { BuildOptions, Model, Op, Sequelize } from 'sequelize';
import { ILogger } from '@willbell71/logger';

import { IDBService } from '../idb-service';
import { TDBServiceSchema } from '../tdb-service-schema';
import { TDBServiceEntity } from '../tdb-service-entity';
import { TDBServiceValue } from '../tdb-service-value';

type TModelFieldType = unknown;

interface IDBModel extends Model, Record<string, TModelFieldType>  {}
type DBModelStatic = typeof Model & {
  new (values?: Record<string, TModelFieldType>, options?: BuildOptions): IDBModel;
}

type Mapping = Record<string, DBModelStatic>;

/**
 * Sequelize db service.
 */
export class SequelizeDBService implements IDBService {
  // logger service
  private logger?: ILogger;
  // db connection
  private dbConnection: Sequelize | null = null;
  // models
  private modelMapper?: Mapping;

  /**
   * Connect.
   * @param {ILogger} logger - logger services provider.
   * @param {string} connection - connection string.
   * @param {TDBServiceSchema[]} schema - entity names and schemas.
   * @return {Promise<void>} promise on connection completion.
   */
  public async connect(logger: ILogger, connection: string, schema: TDBServiceSchema[]): Promise<void> {
    this.logger = logger;

    this.dbConnection = new Sequelize(connection, {
      logging: (msg: string): void => this.logger!.verbose('SequelizeDBService', msg)
    });

    const success: () => Promise<void> = async (): Promise<void> => {
      // create models
      this.modelMapper = {};
      schema.forEach((model: TDBServiceSchema) =>
        this.modelMapper![model.name] = this.dbConnection!.define(model.name, model.schemaDefinition));

      // wait for tables to be created for models
      await this.dbConnection!.sync();
    };

    return new Promise((resolve: () => void) => {
      const attemptToConnect: () => void = (): void => {
        this.logger!.debug('SequelizeDBService', 'Attempting to connect to Sequelize instance...');

        this.dbConnection!
          .authenticate()
          .then(async () => {
            this.logger!.debug('SequelizeDBService', 'Connection successful');

            await success();

            resolve();
          })
          .catch((err: Error) => {
            this.logger!.error(`Failed to connect to sequelize - ${err.message}`);

            // retry again in a bit
            setTimeout(() => {
              attemptToConnect();
            }, 3000);
          });
      };

      // make initial connection attempt
      attemptToConnect();
    });
  }

  /**
   * Register shutdown handler, disconnect from db when shutting down.
   * @return {Promise<void>} promise that resolves on connection closure.
   */
  public async disconnect(): Promise<void> {
    return new Promise((resolve: () => void): void => {
      if (this.dbConnection) {
        this.dbConnection.close()
          .then(() => {
            this.logger?.debug('SequelizeDBService', 'Sequelize disconnected successfully');
            resolve();
          })
          .catch((e: Error) => {
            this.logger?.error(`Sequelize failed to disconnect - ${e.message}`);
            resolve();
          })
          .finally(() => this.dbConnection = null);
      } else {
        this.logger?.error('No sequelize connection available to close');
        resolve();
      }
    });
  }

  /**
   * Create a new instance of an entity type.
   * @param {string} entityType - entity type to create.
   * @param {Record<string, unknown>} values - model initial values.
   * @return {Promise<TDBServiceEntity>} new entity instance.
   */
  public async create(entityType: string, values: Record<string, unknown>): Promise<TDBServiceEntity> {
    if (this.modelMapper) {
      const model: DBModelStatic | undefined = this.modelMapper[entityType];

      if (model) {
        let entity: IDBModel;
        try {
          entity = await model.create(values);
        } catch (_) {
          throw (new Error('Failed to instantiate new entity'));
        }
        return entity;
      } else {
        throw (new Error('Model doesnt exist'));
      }
    } else {
      throw (new Error('Mappings not set, connection must be called with a schema for this entity'));
    }
  }

  /**
   * Set a property value on a given entity.
   * @param {TDBServiceEntity} entity - data entity set property on.
   * @param {string} propName - name of property to set.
   * @param {TDBServiceValue} value - value to set on property.
   * @return {void}
   */
  public setProp(entity: TDBServiceEntity, propName: string, value?: TDBServiceValue): void {
    entity[propName] = value;
  }

  /**
   * Get the value of a given property on a data enity.
   * @param {DBServiceEntity} entity - data entity to get value of.
   * @param {string} propName - name of property to get value for.
   * @return {DBServiceValue} value of property on entity.
   */
  public getProp(entity: TDBServiceEntity, propName: string): TDBServiceValue {
    return entity[propName];
  }

  /**
   * Save a given entity back to the db.
   * @param {DBServiceEntity} entity - entity to save.
   * @return {Promise<boolean>} success.
   */
  public async save(entity: TDBServiceEntity): Promise<boolean> {
    await entity.save();
    return true;
  }

  /**
   * Fetch entities of type who's property matches the given value.
   * @param {string} entityType - entity type to fetch.
   * @param {string} propName - name of property to search on.
   * @param {DBServiceValue} value - value to find.
   * @return {Promise<DBServiceEntity>} entity fetched.
   */
  public async fetch(entityType: string, propName: string, value: TDBServiceValue): Promise<TDBServiceEntity> {
    if (this.modelMapper) {
      // get model from mappings
      const model: DBModelStatic | undefined = this.modelMapper[entityType];
      if (model) {
        return await model.findOne({ where: { [propName]: value }});
      } else {
        throw (new Error('Model doesnt exist'));
      }
    } else {
      throw (new Error('Mappings not set, connection must be called with a schema for this entity'));
    }
  }

  /**
   * Fetch all entities of type that match a query, if no query then return all.
   * @param {string} entityType - entity type to fetch.
   * @param {string} [propName] - name of property to search on.
   * @param {DBServiceValue} [value] - value to find.
   * @return {Promise<DBServiceEntity[]>} entity fetched.
   */
  public async fetchAll(entityType: string, propName?: string, value?: TDBServiceValue): Promise<TDBServiceEntity[]> {
    if (this.modelMapper) {
      // get model from mappings
      const model: DBModelStatic | undefined = this.modelMapper[entityType];
      if (model) {
        if (propName) {
          return await model.findAll({ where: { [propName]: { [Op.eq]: value } }});
        } else {
          return await model.findAll();
        }
      } else {
        throw (new Error('Model doesnt exist'));
      }
    } else {
      throw (new Error('Mappings not set, connection must be called with a schema for this entity'));
    }
  }

  /**
   * Find all entities of type that match a query, if no query then return all.
   * @param {string} entityType - entity type to fetch.
   * @param {{[key: string]: string | RegExp | number | undefined | {lt?: number; gt?: number}}} [search] - search criteria.
   * @param {{[key: string]: number}} [sort] - sort field and direction.
   * @param {number} [start] - search results offset.
   * @param {number} [limit] - search results offset.
   */
  public async findAll(
    entityType: string,
    search?: {[key: string]: string | RegExp | number | undefined | {lt?: number; gt?: number}},
    sort?: {[key: string]: number},
    start?: number,
    limit?: number
  ): Promise<TDBServiceEntity[]> {
    if (this.modelMapper) {
      // get model from mappings
      const model: DBModelStatic | undefined = this.modelMapper[entityType];
      if (model) {
        // parse search and convert to syntax
        const parsedSearch: Record<string, unknown>[] = [];

        for (const prop in search) {
          if (undefined === search[prop]) {}
          else if (typeof search[prop] === 'string' || typeof search[prop] === 'number' || search[prop] instanceof RegExp) {
            parsedSearch.push({ [prop]: search[prop] });
          } else {
            if ((search[prop] as {gt?: number}).gt && (search[prop] as {lt?: number}).lt) {
              parsedSearch.push({ [prop]: { [Op.between]: [(search[prop] as {gt?: number}).gt, (search[prop] as {lt?: number}).lt] }});
            } else {
              if ((search[prop] as {gt?: number}).gt) {
                parsedSearch.push({ [prop]: { [Op.gt]: (search[prop] as {gt?: number}).gt }});
              }
              if ((search[prop] as {lt?: number}).lt) {
                parsedSearch.push({ [prop]: { [Op.lt]: (search[prop] as {lt?: number}).lt }});
              }
            }
          }
        }

        this.logger!.debug('SequelizeDBService findAll', `Performing search for - ${JSON.stringify(parsedSearch)}`);

        const query: Record<string, unknown> = parsedSearch.length > 0 ? {
          where: {
            [Op.and]: parsedSearch
          }
        } : {};

        if (sort) {
          this.logger!.debug('SequelizeDBService findAll', `sorting - ${JSON.stringify(sort)}`);
          const entries: [string, number][] = Object.entries(sort);
          query.order = [entries[0][0], entries[0][1] > 0 ? 'ASC' : 'DESC'];
        }
        if (start) {
          this.logger!.debug('SequelizeDBService findAll', `skipping - ${start}`);
          query.offset = start;
        }
        if (limit) {
          this.logger!.debug('SequelizeDBService findAll', `limiting - ${limit}`);
          query.limit = limit;
        }
        return await model.findAll(query);
      } else {
        throw (new Error('Model doesnt exist'));
      }
    } else {
      throw (new Error('Mappings not set, connection must be called with a schema for this entity'));
    }
  }

  /**
   * Remove an entity from the db.
   * @param {TDBServiceEntity} entity - entity to remove.
   * @return {Promise<boolean>} success.
   */
  public async remove(entity: TDBServiceEntity): Promise<boolean> {
    await entity.destroy();
    return true;
  }
}
