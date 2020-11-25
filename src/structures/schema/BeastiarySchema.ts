import { SchemaDefinition, SchemaTypeOpts } from 'mongoose';
import SchemaFieldRestrictions from './SchemaFieldRestrictions';

export interface BeastiarySchemaOptions extends SchemaTypeOpts<unknown> {
    fieldRestrictions?: SchemaFieldRestrictions
}

export interface BeastiarySchemaDefinition extends SchemaDefinition {
    [fieldName: string]: BeastiarySchemaOptions
}