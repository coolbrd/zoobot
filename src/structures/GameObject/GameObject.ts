import { stripIndent } from "common-tags";
import { Document, Model, Types } from "mongoose";
import { inspect } from "util";
import BeastiaryClient from "../../bot/BeastiaryClient";
import gameConfig from "../../config/gameConfig";
import { BeastiarySchemaDefinition } from '../schema/BeastiarySchema';
import { findRestrictedFieldValueErrors } from '../schema/SchemaFieldRestrictions';
import GameObjectCache from "./GameObjectCache";

export interface FieldRestriction {
    nonNegative?: boolean;
}

export interface ReferencedObject<GameObjectType extends GameObject> {
    cache: GameObjectCache<GameObjectType>,
    id: Types.ObjectId,
    gameObject?: GameObjectType
}

export default abstract class GameObject {
    // The model in which the game object's representative documents are found
    public readonly abstract model: Model<Document>;
    public readonly abstract schemaDefinition: BeastiarySchemaDefinition;

    public readonly beastiaryClient: BeastiaryClient;

    public readonly document: Document;
    public readonly id: Types.ObjectId;

    // The set of field names that are used to access data within this object's document
    public static readonly fieldNames: {[fieldName: string]: string};

    protected static readonly referenceNames: {[referenceName: string]: string};
    protected references: {[referenceName: string]: ReferencedObject<GameObject>} = {};

    private fieldUpdates = new Map<string, NodeJS.Timeout>();

    constructor(document: Document, beastiaryClient: BeastiaryClient) {
        this.beastiaryClient = beastiaryClient;
        this.document = document;
        this.id = document._id;
    }

    private ensureValidField(fieldName: string): void {
        if (!(fieldName in this.schemaDefinition)) {
            throw new Error(stripIndent`
                Invalid field name used in game object field setter.

                Field name: ${fieldName}
                Game object: ${this.debugString}
            `);
        }
    }

    private async updateField(fieldName: string): Promise<void> {
        const value = this.document.get(fieldName);

        await this.document.updateOne({ [fieldName]: value });
    }

    private createFieldUpdateTimeout(fieldName: string): NodeJS.Timeout {
        return setTimeout(() => {
            this.updateField(fieldName).then(() => this.fieldUpdates.delete(fieldName));
        }, gameConfig.gameObjectFieldSaveDelay);
    }

    private createAndSetFieldUpdateTimeout(fieldName: string): void {
        const updateTimeout = this.createFieldUpdateTimeout(fieldName);

        this.fieldUpdates.set(fieldName, updateTimeout);
    }

    public modifyField(fieldName: string): void {
        this.ensureValidField(fieldName);

        if (!this.fieldUpdates.has(fieldName)) {
            this.createAndSetFieldUpdateTimeout(fieldName);
        }
    }

    public setDocumentField(fieldName: string, value: unknown): void {
        this.ensureValidField(fieldName);

        const schemaField = this.schemaDefinition[fieldName];

        if (schemaField.fieldRestrictions) {
            const fieldError = findRestrictedFieldValueErrors(value, schemaField.fieldRestrictions);

            if (fieldError !== undefined) {
                throw new Error(stripIndent`
                    Attempted to set a game object field to an illegal value.

                    Field name: ${fieldName}
                    Value: ${value}
                    Game object: ${this.debugString}
                `);
            }
        }

        this.document.set(fieldName, value);

        this.modifyField(fieldName);
    }

    public async loadFields(): Promise<void> {
        return new Promise((resolve, reject) => {
            const references = Object.values(this.references);
            if (references.length === 0) {
                resolve();
            }

            let completed = 0;
            for (const reference of references) {
                reference.cache.fetchById(reference.id).then(gameObject => {
                    reference.gameObject = gameObject;

                    if (++completed >= references.length) {
                        resolve();
                    }
                }).catch(error => {
                    reject(error);
                });
            }
        });
    }

    protected getReference<GameObjectType>(referenceName: string): GameObjectType {
        if (!(referenceName in this.references)) {
            throw new Error(stripIndent`
                A reference field name that does not exist in a game object's references was attempted to be read.

                Invalid reference field name: ${referenceName}
                Game object: ${this.debugString}
            `);
        }

        const reference = this.references[referenceName];

        if (!reference.gameObject) {
            throw new Error(stripIndent`
                A game object's reference was attempted to be read before it was loaded.

                Reference field name: ${referenceName}
                Game object: ${this.debugString}
            `);
        }

        return reference.gameObject as unknown as GameObjectType;
    }

    public async updateAllFields(): Promise<void> {
        const allFieldUpdates: Promise<void>[] = [];

        for (const [fieldName, fieldUpdateTimeout] of this.fieldUpdates) {
            clearTimeout(fieldUpdateTimeout);

            const update = this.updateField(fieldName);

            allFieldUpdates.push(update);
        }

        await Promise.all(allFieldUpdates);
    }

    // This should only be called after the game object has been properly removed from the game
    public async delete(): Promise<void> {
        try {
            await this.document.deleteOne();
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error deleting a game object's document.

                Document: ${this.document.toString()}
                
                ${error}
            `);
        }
    }

    public get debugString(): string {
        return stripIndent`
            Document: ${this.document.toString()}

            References: ${inspect(this.references)}
        `;
    }
}