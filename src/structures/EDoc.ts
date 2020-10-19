import clone from "clone";
import { capitalizeFirstLetter } from "../utility/arraysAndSuch";
import EDocSkeleton, { EDocFieldInfo, getEDocTypeString } from "./EDocSkeleton";
import PointedArray from "./PointedArray";
import UserError from "./UserError";

// The type of values found within an eDoc instance
export type EDocValue = undefined | string | number | EDoc | PointedArray<EDocField<EDocValue>>;

// The return value of an eDoc-modifying structure
export type SimpleEDoc = { [fieldName: string]: SimpleEDocValue };
export type SimpleEDocValue = undefined | string | number | SimpleEDoc | SimpleEDocValue[];

// A field within an eDoc, packaged with its field information and value
export class EDocField<ValueType extends EDocValue> {
    private readonly info: EDocFieldInfo;
    private value: ValueType;

    constructor(info: EDocFieldInfo) {
        this.info = info;

        // Type-based initialization behavior
        switch(getEDocTypeString(info.type)) {
            case "array": {
                let viewportSize = 0;
                if (this.info.arrayOptions && this.info.arrayOptions.viewportSize) {
                    viewportSize = this.info.arrayOptions.viewportSize;
                }

                this.value = new PointedArray<EDocField<EDocValue>>([], { viewSize: viewportSize }) as ValueType;
                break;
            }
            case "edoc": {
                info.type = info.type as EDocSkeleton;
                this.value = new EDoc(info.type) as ValueType;
                break;
            }
            default: {
                this.value = undefined as ValueType;
                break;
            }
        }
    }

    public getValue(): EDocValue {
        return this.value as ValueType;
    }

    public getAlias(): string | undefined {
        return this.info.alias;
    }

    public getPrompt(): string | undefined {
        return this.info.prompt;
    }

    public getRequired(): boolean {
        return Boolean(this.info.required);
    }

    public getHidden(): boolean {
        return Boolean(this.info.hidden);
    }

    public getTypeString(): "string" | "number" | "array" | "edoc" {
        return getEDocTypeString(this.info.type);
    }

    public getNestedTypeString(): "string" | "number" | "array" | "edoc" | undefined {
        if (!Array.isArray(this.info.type)) {
            return undefined;
        }

        return getEDocTypeString(this.info.type[0].type);
    }

    // Sets this eDoc field's value
    public setValue(input: SimpleEDocValue | EDoc): void {
        // Get a human-friendly name for this field, even if it doesn't have one by default
        const fieldAlias = this.info.alias || "field";

        // Set behavior depending on the type contained within this field
        switch (this.getTypeString()) {
            case "string": {
                if (input === undefined) {
                    this.value = input as ValueType;
                    return;
                }

                if (typeof input !== "string") {
                    throw new TypeError("Non-string input given to an eDoc string field.")
                }

                // Handle string options if they were specified
                if (this.info.stringOptions) {
                    // Apply max length constraint
                    if (this.info.stringOptions.maxLength) {
                        if (input.length > this.info.stringOptions.maxLength) {
                            throw new UserError(`Input for \`${fieldAlias}\` must be less than \`${this.info.stringOptions.maxLength}\` characters in length.`);
                        }
                    }

                    // Normalize case if necessary
                    if (this.info.stringOptions.forceCase) {
                        switch (this.info.stringOptions.forceCase) {
                            case "lower": {
                                input = input.toLowerCase();
                                break;
                            }
                            case "upper": {
                                input = input.toUpperCase();
                                break;
                            }
                            default: {
                                throw new RangeError("Invalid value for eDoc stringOptions forceCase.");
                            }
                        }
                    }
                }

                // Set the new value
                this.value = input as ValueType;
                return;
            }
            case "number": {
                if (input === undefined) {
                    this.value = input as ValueType;
                    return;
                }

                // Attempt to convert the input to a number
                const inputNumber = Number(input);

                if (isNaN(inputNumber)) {
                    throw new UserError(`Input for \`${fieldAlias}\` needs to be numeric.`);
                }

                // Handle number options if they were provided
                if (this.info.numberOptions) {
                    // Apply range constraints
                    if (this.info.numberOptions.min) {
                        if (inputNumber < this.info.numberOptions.min) {
                            throw new UserError(`Input for \`${fieldAlias}\` must be greater than or equal to \`${this.info.numberOptions.min}\`.`);
                        }
                    }

                    if (this.info.numberOptions.max) {
                        if (inputNumber > this.info.numberOptions.max) {
                            throw new UserError(`Input for \`${fieldAlias}\` must be less than or equal to \`${this.info.numberOptions.max}\`.`);
                        }
                    }
                }

                // Assign the new numeric value
                this.value = inputNumber as ValueType;
                return;
            }
            case "array": {
                if (!Array.isArray(input)) {
                    throw new Error("Non-array type given to eDoc array field.");
                }

                // Clear the current array of all values
                // Don't assign the value a new array, as the current array has information (viewport size) to be preserved
                (this.value as PointedArray<EDocField<EDocValue>>).clear();

                // Add each element to the empty array
                for (const element of input) {
                    try {
                        this.push(element);
                    }
                    catch (error) {
                        console.error("There was an error trying to push a value from a set of values to an eDoc array field.");
                        throw error;
                    }
                }
                break;
            }
            case "edoc": {
                if (typeof input !== "object") {
                    throw new Error("Non-Object value given to the set function of an eDoc field.");
                }

                // If this field was just given a pre-created eDoc
                if (input instanceof EDoc) {
                    // Trust that the eDoc meets this field's requirements and set it
                    this.value = input as ValueType;
                }
                // If this field was given a simple object of values
                else {
                    // Create a new eDoc of this field's type
                    const newEDoc = new EDoc(this.info.type as EDocSkeleton);

                    // Iterate over every key/value pair given in the values object
                    for (const [fieldName, fieldValue] of Object.entries(input)) {
                        // Attempt to set each field of the new eDoc to the given values
                        try {
                            newEDoc.setField(fieldName, fieldValue);
                        }
                        catch (error) {
                            console.error("There was an error assigning a value to a field of an eDoc when converting from a simple eDoc value.");
                            throw error;
                        }
                    }

                    // Assign the new eDoc as this field's value
                    this.value = newEDoc as ValueType;
                }
            }
        }
    }

    // Resets the field to a valid empty value
    public clearValue(): void {
        switch (this.getTypeString()) {
            case "string": {
                this.value = undefined as ValueType;
                break;
            }
            case "number": {
                this.value = undefined as ValueType;
                break;
            }
            case "array": {
                this.value = new PointedArray<EDocField<EDocValue>>() as ValueType;
                break;
            }
            case "edoc": {
                this.value = new EDoc(this.info.type as EDocSkeleton) as ValueType;
                break;
            }
        }
    }

    public push(input?: SimpleEDocValue): void {
        if (this.getTypeString() !== "array") {
            throw new Error("A non-array eDoc field was attempted to be used like an array field with the push method.");
        }

        // Clone the array's info so its element type can be extracted
        const arrayInfo = clone(this.info);

        // Get the type of this field's contained array
        const arrayType = arrayInfo.type;

        // If the type in either the info or value of this field isn't an array
        if (!Array.isArray(arrayType) || !Array.isArray(this.value)) {
            throw new Error("A non-array type was found in an eDoc array field.");
        }

        // Extract the element type from the array's type
        const elementInfo = arrayType[0];
        // Mark the element as required, as all array elements need to be checked for validity
        elementInfo.required = true;

        // Create a new field according to the element type
        const newField = new EDocField(elementInfo);
        // Attempt to set the value of the new field
        input && newField.setValue(input);

        // Add the new field to this field's array
        this.value.push(newField);
    }

    // Checks whether or not this field's requirements are met (according to the required field)
    public requirementsMet(): boolean {
        // If this field is marked as not being required, it's automatically met no matter what
        if (!this.getRequired()) {
            return true;
        }
        
        // What marks a requirement as met depends on the type of the requirement
        switch (this.getTypeString()) {
            case "string": {
                // Don't allow undefined or empty strings
                if (!this.getValue()) {
                    return false;
                }
                break;
            }
            case "number": {
                // Don't allow undefind
                if (this.getValue() === undefined) {
                    return false;
                }
                break;
            }
            case "array": {
                const value = this.getValue() as PointedArray<EDocField<EDocValue>>;
                
                // Default minimum length
                let minimumLength = 1;
                // If a separate minimum length was specified
                if (this.info.arrayOptions && this.info.arrayOptions.minimumLength !== undefined) {
                    // Set the specified minimum length
                    minimumLength = this.info.arrayOptions.minimumLength;

                    // Don't allow negative minimum lengths (not that it would break anything, it's just not right)
                    if (minimumLength < 0) {
                        throw new Error("Negative length given to an eDoc field's arrayOptions.minimumLength");
                    }
                }

                // Don't allow arrays that don't meet minimum length requirements
                if (value.length < minimumLength) {
                    return false;
                }

                // Check every value in the array for completion
                for (const field of value) {
                    const arrayField = field as EDocField<EDocValue>;

                    // Don't allow arrays with any incomplete elements
                    if (!arrayField.requirementsMet()) {
                        return false;
                    }
                }
                break;
            }
            case "edoc": {
                const value = this.getValue() as EDoc;

                // Don't allow nested eDocs whose requirements aren't met
                if (!value.requirementsMet()) {
                    return false;
                }
                break;
            }
        }
        
        // If all tests were passed, this field's requirements are met
        return true;
    }

    // Returns this field's value in a simpler form (important for array and eDoc values)
    public getSimpleValue(): SimpleEDocValue {
        // Cover the case of an empty value right away
        if (this.value === undefined) {
            return undefined;
        }

        // Process return info depending on this field's type
        switch (this.getTypeString()) {
            // Return strings and numbers plainly
            case "string": {
                return this.value as string;
            }
            case "number": {
                return this.value as number;
            }
            // Return a simple array of simple values
            case "array": {
                const value = this.value as PointedArray<EDocField<EDocValue>>;

                const returnArray: SimpleEDocValue[] = [];
                // Add every element in this array as its simple value form
                for (const field of value) {
                    returnArray.push(field.getSimpleValue());
                }

                return returnArray;
            }
            // Return a simple object of simple values
            case "edoc": {
                const value = this.value as EDoc;

                const returnObject: SimpleEDocValue = {};
                // Add every field in this eDoc as its simple value form
                for (const [fieldName, field] of value.getFields()) {
                    Object.defineProperty(returnObject, fieldName, {
                        value: field.getSimpleValue(),
                        writable: false,
                        enumerable: true
                    });
                }

                return returnObject;
            }
        }
    }

    // Converts an eDoc field to a string
    public toString(options?: { arrayPointer?: string }): string {
        // Display behavior depends on data type
        switch (this.getTypeString()) {
            case "string": {
                const value = this.getValue() as string;
                return value || "*Empty*";
            }
            case "number": {
                const value = this.getValue() as number;
                return value === undefined ? "*NaN*" : value.toString();
            }
            case "array": {
                const value = this.getValue() as PointedArray<EDocField<EDocValue>>;

                // Convert the array to a string, but use the eDoc element's value fields instead of just displaying them as [Object]
                return value.toString({
                    delimiter: "\n",
                    numbered: true,
                    pointer: options && options.arrayPointer,
                    filter: (field: EDocField<EDocValue>) => {
                        return `${field.requirementsMet() ? "" : "✗"}${field.toString()}`},
                    numberFilter: (number: string) => {
                        return `\`${number}\` `;
                    }}) || "*Empty list*";
            }
            case "edoc": {
                const value = this.getValue() as EDoc;

                // If a field to override this document's display was provided
                if (this.info.documentOptions && this.info.documentOptions.displayField) {
                    const displayFieldName = this.info.documentOptions.displayField;

                    // Make sure the eDoc has a field with the given name
                    if (!value.hasField(displayFieldName)) {
                        throw new Error("Invalid field name found in eDocField.info.documentOptions.displayField");
                    }

                    // Get the field specified
                    const displayField = value.getField(displayFieldName);

                    // Display this eDoc as the value of the display field
                    return displayField.toString();
                }

                // If no display field was provided, just label the document as its alias
                return `__${capitalizeFirstLetter(`${this.info.alias || "anonymous"} document`)}__`;
            }
        }
    }
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

    constructor(skeleton: EDocSkeleton) {
        this.skeleton = skeleton;

        // Iterate over every field's information in the provided eDoc skeleton
        for (const [fieldName, fieldInfo] of Object.entries(skeleton)) {
            // Create a new field with the current field's information
            const newField = new EDocField(fieldInfo);

            // Add the new field
            this.fields.set(fieldName, newField);

            // Add the new field's name if it's not a hidden field
            if (!fieldInfo.hidden) {
                this.fieldNames.push(fieldName);
            }
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

    public setField(fieldName: string, value: SimpleEDocValue): void {
        if (!this.hasField(fieldName)) {
            throw new Error(`Attempted to set an eDoc's field by a name that doesn't map to any existing field. Invalid field: '${fieldName}'`);
        }

        this.getField(fieldName).setValue(value);
    }

    public hasField(fieldName: string): boolean {
        return this.fields.has(fieldName);
    }

    // Pointer movement
    public decrementPointer(): void {
        this.fieldNames.decrementPointer();
    }

    public incrementPointer(): void {
        this.fieldNames.incrementPointer();
    }

    // Checks if all of this eDoc's field requirements are met
    public requirementsMet(): boolean {
        // Check every field
        for (const field of this.fields.values()) {
            // If any field is not satisfied, return false
            if (!field.requirementsMet()) {
                return false;
            }
        }

        // If all fields are satisfied, return true
        return true;
    }
}