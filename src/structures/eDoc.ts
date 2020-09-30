import clone from "clone";
import { capitalizeFirstLetter } from "../utility/arraysAndSuch";
import { EDocFieldInfo, EDocSkeleton, EDocTypeHint, getEDocTypeString } from "./eDocSkeleton";
import { PointedArray } from "./pointedArray";
import { UserError } from "./userError";

// The type of values found within an eDoc instance
export type EDocValue = undefined | string | number | EDoc | PointedArray<EDocField<EDocValue>>;

// An eDoc instance's field, contains information about the field and the value itself
// Generic so type inferences about the field's value don't have to constantly be made
export interface EDocField<ValueType extends EDocValue> {
    info: EDocFieldInfo,
    value: ValueType
}

// An eDoc object that can be initialized from an eDoc skeleton
// Takes input for fields according to their defined type and options
export class EDoc {
    // The eDoc's skeleton, used as the eDoc's type when it's nested in another eDoc field
    private skeleton: EDocSkeleton;

    // This eDoc's fields to be set and manipulated
    private fields = new Map<string, EDocField<EDocValue>>();

    // This eDoc's field names, repeated in a pointed array so they can be traversed easily with a pointer
    private fieldNames = new PointedArray<string>();

    public constructor(skeleton: EDocSkeleton) {
        this.skeleton = skeleton;

        // Iterate over every field's information in the provided eDoc skeleton
        for (const [fieldName, fieldInfo] of Object.entries(skeleton)) {
            // Initialize a new field with the given field information
            const newField: EDocField<EDocValue> = {
                info: fieldInfo,
                value: undefined
            }

            // Initialize field values as something other than undefined, depending on the field's type
            switch (getEDocTypeString(fieldInfo.type)) {
                // Give array fields an empty pointed array
                case 'array': {
                    newField.value = new PointedArray<EDocField<EDocValue>>();
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
    public getField(fieldName: string): EDocField<EDocValue> {
        const field = this.fields.get(fieldName);

        if (!field) {
            throw new RangeError('Attempted to get data from an EDoc field that doesn\'t exist.');
        }

        return field;
    }

    // Gets this document's field map
    public getFields(): Map<string, EDocField<EDocValue>> {
        return this.fields;
    }

    // Get the document's currently selected field
    public getSelectedField(): EDocField<EDocValue> {
        const selectedField = this.fields.get(this.fieldNames.selection());

        if (!selectedField) {
            throw new Error('A field name that mapped to no field in an EDoc\'s fields was found.');
        }

        return selectedField;
    }

    // Gets the eDoc's currently selected field's identifier
    public getSelectedFieldName(): string {
        return this.fieldNames.selection();
    }

    // Sets a field based on its name
    public setFieldByName(fieldName: string, input: string | number): void {
        // Get the field that was specified for setting
        const field = this.fields.get(fieldName);

        if (!field) {
            throw new RangeError('Invalid field name provided to EDoc.prototype.set.');
        }

        // Attempt to set the field to the given input
        setEDocField(field, input);
    }

    public hasField(fieldName: string): boolean {
        return this.fieldNames.includes(fieldName);
    }

    // Pointer movement
    public decrementPointer(): void {
        this.fieldNames.decrementPointer();
    }

    public incrementPointer(): void {
        this.fieldNames.incrementPointer();
    }
}

// Converts an eDoc field to a string
export function eDocFieldToString(field: EDocField<EDocValue>, options?: { arrayPointer?: string }): string {
    switch (getEDocTypeString(field.info.type)) {
        case 'string': {
            field.value = field.value as string;
            return field.value || '*Empty*';
        }
        case 'number': {
            field.value = field.value as number;
            return field.value === undefined ? '*NaN*' : field.value.toString();
        }
        case 'array': {
            field.value = field.value as PointedArray<EDocField<EDocValue>>;

            // Convert the array to a string, but use the eDoc element's value fields instead of just displaying them as [Object]
            return field.value.toString({ delimiter: '\n', numbered: true, pointer: options && options.arrayPointer, filter: (field: EDocField<EDocValue>) => {
                return capitalizeFirstLetter(eDocFieldToString(field));
            }}) || '*Empty list*';
        }
        case 'edoc': {
            field.value = field.value as EDoc;

            if (field.info.documentOptions && field.info.documentOptions.displayField) {
                const displayFieldName = field.info.documentOptions.displayField;
                if (!field.value.hasField(displayFieldName)) {
                    throw new Error('Invalid field name found in eDocField.info.documentOptions.displayField');
                }

                const displayField = field.value.getField(displayFieldName);

                return eDocFieldToString(displayField);
            }
            else {
                return `${capitalizeFirstLetter(field.info.alias || 'anonymous')} document`;
            }
        }
    }
}

// Takes a field, some input, and attempts to set the field as the given input
export function setEDocField(field: EDocField<EDocValue>, input: EDocValue): void {
    // Get a human-friendly name for this field, even if it doesn't have one by default
    const fieldAlias = field.info.alias || 'field';

    // Set behavior depending on the type contained within this field
    switch (getEDocTypeString(field.info.type)) {
        case 'string': {
            if (input === undefined) {
                field.value = input;
                return;
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
            if (input === undefined) {
                field.value = input;
                return;
            }

            // Attempt to convert the input to a number
            const inputNumber = Number(input);

            if (isNaN(inputNumber)) {
                throw new UserError(`Input for \`${fieldAlias}\` needs to be numeric.`);
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
                        throw new UserError(`Input for \`${fieldAlias}\` must be less than or equal to \`${field.info.numberOptions.max}\`.`);
                    }
                }
            }

            // Assign the new numeric value
            field.value = inputNumber;
            return;
        }
        // Don't let the set method be used with arrays and documents, that doesn't make sense!
        case 'array': {
            if (!Array.isArray(input)) {
                throw new Error('Non-array type given to eDoc array field.');
            }

            field.value = new PointedArray<EDocField<EDocValue>>();

            for (const element of input) {
                try {
                    pushEDocArrayField(field as EDocField<PointedArray<EDocField<EDocValue>>>, element);
                }
                catch (error) {
                    console.error('There was an error trying to push a value from a set of values to an eDoc array field.');
                    throw error;
                }
            }
            break;
        }
        case 'edoc': {
            throw new Error('eDoc fields cannot be set.');
        }
    }
}

// Takes an eDoc array field and pushes a new value to it
export function pushEDocArrayField(field: EDocField<PointedArray<EDocField<EDocValue>>>, input?: string | number): void {
    // Clone the array's info so its element type can be extracted
    const elementInfo = clone(field.info);
    
    if (!Array.isArray(elementInfo.type)) {
        throw new Error('Non-array eDoc field given to pushEDocArrayField.');
    }

    const possibleElementType = elementInfo.type[0];

    let elementType: EDocTypeHint;
    let newField: EDocField<EDocValue>;
    if (!Array.isArray(possibleElementType) && typeof possibleElementType === 'object') {
        elementType = possibleElementType.type;
        newField = {
            info: possibleElementType,
            value: undefined
        }
    }
    else {
        elementType = possibleElementType;
        newField = {
            info: {
                type: possibleElementType,
                // Give each entry a human-readable name
                alias: field.info.arrayOptions && field.info.arrayOptions.elementAlias || `${field.info.alias || 'anonymous list'} entry`
            },
            value: undefined
        }
    }

    // Initialize different values depending on the type of the element to add
    switch (getEDocTypeString(elementType)) {
        // Just set the field in the case of simple string and number fields
        case 'string':
        case 'number': {
            if (!input) {
                throw new Error('Input is required for creating a new field in an eDoc array field.');
            }

            setEDocField(newField, input);
            break;
        }
        // Initialize new array elements to an empty pointed array
        case 'array': {
            newField.value = new PointedArray<EDocField<EDocValue>>();
            break;
        }
        // Initialize new document elements to a new document of that type
        case 'edoc': {
            newField.value = new EDoc(elementType as EDocSkeleton);
            break;
        }
    }

    // Add the new field to the array
    field.value.push(newField);
}