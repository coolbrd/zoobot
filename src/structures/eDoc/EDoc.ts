import clone from "clone";
import { capitalizeFirstLetter } from "../../utility/arraysAndSuch";
import EDocSkeleton, { EDocFieldInfo, getEDocTypeString } from "./EDocSkeleton";
import PointedArray from "../PointedArray";
import UserError from "../UserError";
import { stripIndent } from "common-tags";
import { inspect } from "util";

export type EDocValue = undefined | string | number | EDoc | PointedArray<EDocField<EDocValue>>;

export type SimpleEDoc = { [fieldName: string]: SimpleEDocValue };
export type SimpleEDocValue = undefined | string | number | SimpleEDoc | SimpleEDocValue[];

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

    public setValue(input: SimpleEDocValue | EDoc): void {
        const fieldAlias = this.info.alias || "field";

        switch (this.getTypeString()) {
            case "string": {
                if (input === undefined) {
                    this.value = input as ValueType;
                    return;
                }

                if (typeof input !== "string") {
                    throw new TypeError("Non-string input given to an eDoc string field.")
                }

                if (this.info.stringOptions) {
                    if (this.info.stringOptions.maxLength) {
                        if (input.length > this.info.stringOptions.maxLength) {
                            throw new UserError(`Input for \`${fieldAlias}\` must be less than \`${this.info.stringOptions.maxLength}\` characters in length.`);
                        }
                    }

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

                this.value = input as ValueType;
                return;
            }
            case "number": {
                if (input === undefined) {
                    this.value = input as ValueType;
                    return;
                }

                const inputNumber = Number(input);

                if (isNaN(inputNumber)) {
                    throw new UserError(`Input for \`${fieldAlias}\` needs to be numeric.`);
                }

                if (this.info.numberOptions) {
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

                this.value = inputNumber as ValueType;
                return;
            }
            case "array": {
                if (!Array.isArray(input)) {
                    throw new Error(stripIndent`
                        Non-array type given to eDoc array field.

                        Input: ${inspect(input)}
                    `);
                }

                (this.value as PointedArray<EDocField<EDocValue>>).clear();

                for (const element of input) {
                    try {
                        this.push(element);
                    }
                    catch (error) {
                        throw new Error(stripIndent`
                            There was an error trying to push a value from a set of values to an eDoc array field.

                            Element pushed: ${inspect(element)}
                        `);
                    }
                }
                break;
            }
            case "edoc": {
                if (typeof input !== "object") {
                    throw new Error(stripIndent`
                        Non-Object value given to the set function of an eDoc field.

                        Input: ${inspect(input)}
                    `);
                }

                // If this field was just given a pre-created eDoc
                if (input instanceof EDoc) {
                    // Trust that the eDoc meets this field's requirements and set it
                    this.value = input as ValueType;
                }
                // If this field was given a simple object of values
                else {
                    const newEDoc = new EDoc(this.info.type as EDocSkeleton);

                    for (const [fieldName, fieldValue] of Object.entries(input)) {
                        try {
                            newEDoc.setField(fieldName, fieldValue);
                        }
                        catch (error) {
                            throw new Error(`
                                There was an error assigning a value to a field of an eDoc when converting from a simple eDoc value.

                                Field name: ${fieldName}
                                Field value: ${inspect(fieldValue)}

                                ${error}
                            `);
                        }
                    }

                    this.value = newEDoc as ValueType;
                }
            }
        }
    }

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
            throw new Error(stripIndent`
                A non-array eDoc field was attempted to be used like an array field with the push method.

                Field: ${inspect(this)}
            `);
        }

        // Clone the array's info so its element type can be extracted
        const arrayInfo = clone(this.info);

        // Get the type of this field's contained array
        const arrayType = arrayInfo.type;

        if (!Array.isArray(arrayType) || !Array.isArray(this.value)) {
            throw new Error(stripIndent`
                A non-array type was found in an eDoc array field.

                Field: ${inspect(this)}
                Array type: ${inspect(arrayType)}
            `);
        }

        const elementInfo = arrayType[0];
        elementInfo.required = true;

        const newField = new EDocField(elementInfo);
        
        if (input) {
            newField.setValue(input);
        }

        (this.value as unknown[]).push(newField);
    }

    public requirementsMet(): boolean {
        if (!this.getRequired()) {
            return true;
        }
        
        switch (this.getTypeString()) {
            case "string": {
                if (!this.getValue()) {
                    return false;
                }
                break;
            }
            case "number": {
                if (this.getValue() === undefined) {
                    return false;
                }
                break;
            }
            case "array": {
                const value = this.getValue() as PointedArray<EDocField<EDocValue>>;
                
                let minimumLength = 1;
                if (this.info.arrayOptions && this.info.arrayOptions.minimumLength !== undefined) {
                    minimumLength = this.info.arrayOptions.minimumLength;

                    if (minimumLength < 0) {
                        throw new Error(stripIndent`
                            Negative length given to an eDoc field's arrayOptions.minimumLength.
                            
                            Length: ${minimumLength}
                        `);
                    }
                }

                if (value.length < minimumLength) {
                    return false;
                }

                for (const field of value) {
                    const arrayField = field as EDocField<EDocValue>;

                    if (!arrayField.requirementsMet()) {
                        return false;
                    }
                }
                break;
            }
            case "edoc": {
                const value = this.getValue() as EDoc;

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
        if (this.value === undefined) {
            return undefined;
        }

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

                for (const field of value) {
                    returnArray.push(field.getSimpleValue());
                }

                return returnArray;
            }
            // Return a simple object of simple values
            case "edoc": {
                const value = this.value as EDoc;

                const returnObject: SimpleEDocValue = {};
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

    public toString(options?: { arrayPointer?: string }): string {
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

                if (this.info.documentOptions && this.info.documentOptions.displayField) {
                    const displayFieldName = this.info.documentOptions.displayField;

                    if (!value.hasField(displayFieldName)) {
                        throw new Error(stripIndent`
                            Invalid field name found in eDocField.info.documentOptions.displayField.

                            Field name: ${displayFieldName}
                            eDoc: ${inspect(this)}
                        `);
                    }

                    const displayField = value.getField(displayFieldName);

                    return displayField.toString();
                }

                return `__${capitalizeFirstLetter(`${this.info.alias || "anonymous"} document`)}__`;
            }
        }
    }
}

export class EDoc {
    // The eDoc's skeleton, used as the eDoc's type when it's nested in another eDoc field
    private skeleton: EDocSkeleton;

    private fields = new Map<string, EDocField<EDocValue>>();

    private fieldNames = new PointedArray<string>();

    constructor(skeleton: EDocSkeleton) {
        this.skeleton = skeleton;

        for (const [fieldName, fieldInfo] of Object.entries(skeleton)) {
            const newField = new EDocField(fieldInfo);

            this.fields.set(fieldName, newField);

            if (!fieldInfo.hidden) {
                this.fieldNames.push(fieldName);
            }
        }
    }

    public getSkeleton(): EDocSkeleton {
        return this.skeleton;
    }

    public getField(fieldName: string): EDocField<EDocValue> {
        const field = this.fields.get(fieldName);

        if (!field) {
            throw new RangeError(stripIndent`
                Attempted to get data from an EDoc field that doesn't exist.

                Field name: ${fieldName}
            `);
        }

        return field;
    }

    public getFields(): Map<string, EDocField<EDocValue>> {
        return this.fields;
    }

    public getSelectedField(): EDocField<EDocValue> {
        const selectedField = this.fields.get(this.fieldNames.selection);

        if (!selectedField) {
            throw new Error(stripIndent`
                A field name that mapped to no field in an EDoc's fields was found.

                Selected field name: ${this.fieldNames.selection}
            `);
        }

        return selectedField;
    }

    public getSelectedFieldName(): string {
        return this.fieldNames.selection;
    }

    public setField(fieldName: string, value: SimpleEDocValue): void {
        if (!this.hasField(fieldName)) {
            throw new Error(stripIndent`
                Attempted to set an eDoc's field by a name that doesn't map to any existing field.
                
                Field name: ${fieldName}
            `);
        }

        this.getField(fieldName).setValue(value);
    }

    public hasField(fieldName: string): boolean {
        return this.fields.has(fieldName);
    }

    public decrementPointer(): void {
        this.fieldNames.decrementPointer();
    }

    public incrementPointer(): void {
        this.fieldNames.incrementPointer();
    }

    public requirementsMet(): boolean {
        // Check every field
        for (const field of this.fields.values()) {
            if (!field.requirementsMet()) {
                return false;
            }
        }

        return true;
    }
}