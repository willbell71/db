/**
 * DB Service schema definition.
 * @property {string} name - entity name.
 * @property {any} schemaDefinition - schema definition.
 */
export type TDBServiceSchema = {
  name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schemaDefinition: any;
};
