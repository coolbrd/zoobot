import { stripIndent } from 'common-tags';

export default interface SchemaFieldRestrictions {
    nonNegative?: boolean,
    maxListSize?: number
}

// Checks if a value is valid in accordance with a given set of field restrictions
export function fieldValueIsValid(value: unknown, restrictions: SchemaFieldRestrictions): boolean {
    if (restrictions.nonNegative !== undefined) {
        if (typeof value !== "number") {
            throw new Error(stripIndent`
                Illegal value found in restricted field.

                Value: ${value}
            `);
        }

        if (restrictions.nonNegative) {
            if (value < 0) {
                return false;
            }
        }
    }

    if (restrictions.maxListSize !== undefined) {
        if (!Array.isArray(value)) {
            throw new Error(stripIndent`
                Illegal  value found in restricted field.

                Value: ${value}
            `);
        }

        if (value.length > restrictions.maxListSize) {
            return false;
        }
    }

    return true;
}