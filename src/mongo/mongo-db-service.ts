import * as mongoose from 'mongoose';

import { IDBService } from '../idb-service';
import { ILogger } from '@willbell71/logger';
import { TDBServiceEntity } from '../tdb-service-entity';
import { TDBServiceValue } from '../tdb-service-value';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EntityModel = any;

type EntityMapping = {
  schema: mongoose.Schema;
  model: mongoose.Model<EntityModel>;
};

type Mappings = {
  [key: string]: EntityMapping;
};

type SchemaMapping = {
  name: string;
  schemaDefinition: mongoose.SchemaDefinition;
};

/**
 * DB service interface.
 */
export class MongoDBService implements IDBService {
  // logger service
  private logger?: ILogger;
  // db schemas
  private schema?: SchemaMapping[];
  // db schema mapping to mongoose schema and model
  private mappings?: Mappings;

  /**
   * Connect to db and set up schema, will continue to retry until success.
   * @param {ILogger} logger - logger services provider.
   * @param {string} connection - connection string.
   * @param {SchemaMapping[]} schema - entity names and schemas.
   * @return {Promise<void>} promise on connection completion.
   */
  public connect(logger: ILogger, connection: string, schema: SchemaMapping[]): Promise<void> {
    this.logger = logger;
    this.schema = schema;    

    const success: () => void = (): void => {
      this.logger!.info('MongoDBService', 'Mongo database connected');

      // generate mongoose schemas and mappings
      this.mappings = {};
      this.schema!.forEach((entity: SchemaMapping) => {
        const {name, schemaDefinition}: {name: string; schemaDefinition: mongoose.SchemaDefinition} = entity;
        const mSchema: mongoose.Schema = new mongoose.Schema(schemaDefinition, {timestamps: true});
        this.mappings![name] = {
          schema: mSchema,
          model: mongoose.model(name, mSchema)
        };
      });
    };

    return new Promise<void>((
      resolve: ((value?: void | PromiseLike<void> | undefined) => void)
    ): void => {
      // need to retry incase the db isn't up yet
      const attemptToConnect: () => void = () => {
        this.logger!.debug('MongoDBService', 'Attempting to connect to MongoDB instance...');
        // attempt to connect to mongo
        mongoose.connect(connection, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
          useCreateIndex: true
        })
          .then(() => {
            // success, finish up
            success();

            resolve();
          })
          .catch((err: Error) => {
            this.logger!.error(`Failed to connect to mongo db - ${err.message}`);

            // retry again in a bit
            setTimeout(() => {
              attemptToConnect();
            }, 3000);
          });
      };

      // make initial connection attempt immediately
      attemptToConnect();
    });
  }

  /**
   * Disconnect.
   * @return {Promise<void>} promise that resolves on disconnect, success or failure.
   */
  public disconnect(): Promise<void> {
    return new Promise((resolve: () => void): void => {
      // disconnect
      mongoose
        .disconnect()
        .then(() => {
          if (this.logger) {
            this.logger.debug('MongoDBService', 'MongoDB disconnected successfully');
          }
          resolve();
        })
        .catch((err: Error) => {
          if (this.logger) {
            this.logger.error(`MongoDBService failed to disconnect - ${err.message}`);
          }
          resolve();
        });
    });
  }

  /**
   * Create a new instance of an entity type.
   * @param {string} entityType - entity type to create.
   * @param {Record<string, unknown>} values - model initial values.
   * @return {Promise<TDBServiceEntity>} new entity instance.
   */
  public async create(entityType: string, values: Record<string, unknown>): Promise<TDBServiceEntity> {
    if (this.mappings) {
      // get model from mongoose mappings
      const model: EntityMapping | undefined = this.mappings[entityType];
      if (model) {
        const EntityClass: mongoose.Model<EntityModel> = model.model;

        // create a new instance
        let entity: mongoose.Model<EntityModel>;
        try {
          entity = new EntityClass(values);
        } catch (_) {
          throw (new Error('Failed to instantiate new entity'));
        }

        // return instance
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
    if (this.mappings) {
      // get model from mongoose mappings
      const model: EntityMapping = this.mappings[entityType];
      if (model) {
        const entityModel: mongoose.Model<EntityModel> = model.model;

        if ('id' === propName) {
          return await entityModel.findById(value);
        } else {
          return await entityModel.findOne({[propName]: value});
        }
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
    if (this.mappings) {
      // get model from mongoose mappings
      const model: EntityMapping = this.mappings[entityType];
      if (model) {
        const entityModel: mongoose.Model<EntityModel> = model.model;

        if (propName) {
          return await entityModel.find({[propName]: value});
        } else {
          return await entityModel.find();
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
    if (this.mappings) {
      // get model from mongoose mappings
      const model: EntityMapping = this.mappings[entityType];
      if (model) {
        const entityModel: mongoose.Model<EntityModel> = model.model;

        // parse search and convert to Mongoose syntax - lt -> $lt etc.
        const parsedSearch: {[key: string]: number | string | RegExp | {$gt?: number; $lt?: number}} = {};
        for (const prop in search) {
          if (undefined === search[prop]) {}
          else if (typeof search[prop] === 'string' || typeof search[prop] === 'number' || search[prop] instanceof RegExp) {
            parsedSearch[prop] = search[prop] as string | number | RegExp;
          } else {
            const value: {$gt?: number; $lt?: number} = {};
            if ((search[prop] as {gt?: number}).gt) {
              value.$gt = (search[prop] as {gt?: number}).gt;
            }
            if ((search[prop] as {lt?: number}).lt) {
              value.$lt = (search[prop] as {lt?: number}).lt;
            }
            parsedSearch[prop] = value;
          }
        }

        this.logger!.debug('MongoDBService findAll', `Performing search for - ${JSON.stringify(parsedSearch)}`);

        const query: mongoose.DocumentQuery<{}[], mongoose.Document> = entityModel.find(parsedSearch);
        if (sort) {
          this.logger!.debug('MongoDBService findAll', `sorting - ${JSON.stringify(sort)}`);
          query.sort(sort);
        }
        if (start) {
          this.logger!.debug('MongoDBService findAll', `skipping - ${start}`);
          query.skip(start);
        }
        if (limit) {
          this.logger!.debug('MongoDBService findAll', `limiting - ${limit}`);
          query.limit(limit);
        }
        return await query.exec();
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
    await entity.remove();
    return true;
  }
}
