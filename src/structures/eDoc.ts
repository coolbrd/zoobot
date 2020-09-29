import { PointedArray } from "./pointedArray";
import { UserError } from "./userError";

// Acceptable values for an eDoc's declared type
// Types that are nested eDocs are simply declared in their simple skeletal form
// Array types are indicated by encapsulating any declared type in square brackets
export type EDocTypeHint = StringConstructor | NumberConstructor | EDocSkeleton | EDocTypeHint[];

// The set of information that goes with every eDoc field
export interface EDocFieldInfo {
    // The field's value's type
    type: EDocTypeHint,
    // Whether or not the value is marked as being required for completion
    required?: boolean,
    // The human-friendly string to display as the name of this field
    alias?: string,
    // The text that prompts the user for input for this field
    prompt?: string,
    // Whether or not this field should be hidden from plain view (usually used to store immutable data for later programatic use)
    hidden?: boolean,
    // Options for what constitutes valid string input, and what to do with string input
    stringOptions?: {
        // The string value's max length, in characters
        maxLength?: number,
        // The case to normalize any string input to
        forceCase?: 'lower' | 'upper'
    },
    // Options for what constitutes valid number input, and what to do with number input
    numberOptions?: {
        // The acceptable range of number input
        min?: number,
        max?: number
    },
    // Options for array behavior
    arrayOptions?: {
        // The minimum number of elements required to satisfy an array that's marked as required (defaults to 1)
        minimumLength?: number,
        // The size of the viewable portion of the array
        viewportSize?: number
    }
}

// A set of eDoc field information, used in the creation of eDoc instances and nested eDocs
export interface EDocSkeleton {
    [fieldName: string]: EDocFieldInfo
}

// The type of values found within an eDoc instance
export type EDocValue = undefined | string | number | EDoc | PointedArray<EDocField>;

// An eDoc instance's field, contains information about the field and the value itself
export interface EDocField {
    info: EDocFieldInfo,
    value: EDocValue
}

// An eDoc object that can be initialized from an eDoc skeleton
// Takes input for fields according to their defined type and options
export class EDoc {
    // The eDoc's skeleton, used as the eDoc's type when it's nested in another eDoc field
    private skeleton: EDocSkeleton;

    // This eDoc's fields to be set and manipulated
    private fields = new Map<string, EDocField>();

    // This eDoc's field names, repeated in a pointed array so they can be traversed easily with a pointer
    private fieldNames = new PointedArray<string>();

    public constructor(skeleton: EDocSkeleton) {
        this.skeleton = skeleton;

        // Iterate over every field's information in the provided eDoc skeleton
        for (const [fieldName, fieldInfo] of Object.entries(skeleton)) {
            // Initialize a new field with the given field information
            const newField: EDocField = {
                info: fieldInfo,
                value: undefined
            }

            // Initialize field values as something other than undefined, depending on the field's type
            switch (getEDocTypeString(fieldInfo.type)) {
                // Give array fields an empty pointed array
                case 'array': {
                    newField.value = new PointedArray<EDocField>();
                    break;
                }
                // Give eDoc fields a new eDoc according to their type
                case 'edoc': {
                    fieldInfo.type = fieldInfo.type as EDocSkeleton;

                    newField.value = new EDoc(fieldInfo.type);
                    break;
                }
            }

            // Add the new field
            this.fields.set(fieldName, newField);
            this.fieldNames.push(fieldName);
        }
    }

    public getSkeleton(): EDocSkeleton {
        return this.skeleton;
    }

    // Gets a field by its identifier
    public getField(fieldName: string): EDocField {
        const field = this.fields.get(fieldName);

        if (!field) {
            throw new RangeError('Attempted to get data from an EDoc field that doesn\'t exist.');
        }

        return field;
    }

    // Gets this document's field map
    public getFields(): Map<string, EDocField> {
        return this.fields;
    }

    // Get the document's currently selected field name
    public getSelectedField(): EDocField {
        const selectedField = this.fields.get(this.fieldNames.selection());

        if (!selectedField) {
            throw new Error('A field name that mapped to no field in an EDoc\'s fields was found.');
        }

        return selectedField;
    }

    public getSelectedFieldName(): string {
        return this.fieldNames.selection();
    }

    // Sets a field based on its name
    public set(fieldName: string, input?: string | number): void {
        // Get the field that was specified for setting
        const field = this.fields.get(fieldName);

        if (!field) {
            throw new RangeError('Invalid field name provided to EDoc.prototype.set.');
        }

        // Get a human-friendly name for this field, even if it doesn't have one by default
        const fieldAlias = this.getField(fieldName).info.alias || 'field';

        // Set behavior depending on the type contained within this field
        switch (getEDocTypeString(field.info.type)) {
            case 'string': {
                if (!input) {
                    throw new TypeError('Input field is required for setting a field value in an eDoc.');
                }

                if (typeof input !== 'string') {
                    throw new TypeError('Non-string input given to an eDoc string field.')
                }

                // Handle string options if they were specified
                if (field.info.stringOptions) {
                    // Apply max length constraint
                    if (field.info.stringOptions.maxLength) {
                        if (input.length > field.info.stringOptions.maxLength) {
                            throw new UserError(`Input for \`${fieldAlias}\` must be less than \`${field.info.stringOptions.maxLength}\` characters in length.`);
                        }
                    }

                    // Normalize case if necessary
                    if (field.info.stringOptions.forceCase) {
                        switch (field.info.stringOptions.forceCase) {
                            case 'lower': {
                                input = input.toLowerCase();
                                break;
                            }
                            case 'upper': {
                                input = input.toUpperCase();
                                break;
                            }
                            default: {
                                throw new RangeError('Invalid value for eDoc stringOptions forceCase.');
                            }
                        }
                    }
                }

                // Set the new value
                field.value = input;
                return;
            }
            case 'number': {
                if (!input) {
                    throw new TypeError('Input field is required for setting a field value in an eDoc.');
                }

                // Attempt to convert the input to a number
                const inputNumber = Number(input);

                if (isNaN(inputNumber)) {
                    throw new UserError(`Input for \`${fieldAlias}\` needs to be a numeric.`);
                }

                // Handle number options if they were provided
                if (field.info.numberOptions) {
                    // Apply range constraints
                    if (field.info.numberOptions.min) {
                        if (inputNumber < field.info.numberOptions.min) {
                            throw new UserError(`Input for \`${fieldAlias}\` must be greater than or equal to \`${field.info.numberOptions.min}\`.`);
                        }
                    }

                    if (field.info.numberOptions.max) {
                        if (inputNumber > field.info.numberOptions.max) {
                            throw new UserError(`Input for \`${fieldAlias}\` must be less than or equal to \`${field.info.numberOptions.min}\`.`);
                        }
                    }
                }

                // Assign the new numeric value
                field.value = inputNumber;
                return;
            }
            // Don't let the set method be used with arrays and documents, that doesn't make sense!
            case 'array':
            case 'edoc': {
                throw new Error('Array and eDoc fields cannot be set.');
            }
        }
    }

    // Pointer movement
    public decrementPointer(): void {
        this.fieldNames.decrementPointer();
    }

    public incrementPointer(): void {
        this.fieldNames.incrementPointer();
    }
}

// Reduces an eDoc type hint to a simple string
export function getEDocTypeString(type: EDocTypeHint): 'string' | 'number' | 'array' | 'edoc' {
    switch (type) {
        case String: {
            return 'string';
        }
        case Number: {
            return 'number';
        }
        default: {
            if (Array.isArray(type)) {
                return 'array';
            }
            else {
                return 'edoc';
            }
        }
    }
}