import { stripIndent } from "common-tags";
import { Document, Model, Types } from "mongoose";
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

    protected readonly beastiaryClient: BeastiaryClient;

    protected readonly document: Document;
    public readonly id: Types.ObjectId;

    // The set of field names that are used to access data within this object's document
    public static readonly fieldNames: {[fieldName: string]: string};

    protected static readonly referenceNames: {[referenceName: string]: string};
    protected references: {[referenceName: string]: ReferencedObject<GameObject>} = {};

    private modifiedSinceLastSave = false;
    private saveTimer: NodeJS.Timeout | undefined;
    private saveDelay = gameConfig.gameObjectSaveDelay;

    constructor(document: Document, beastiaryClient: BeastiaryClient) {
        this.beastiaryClient = beastiaryClient;
        this.document = document;
        this.id = document._id;
    }

    private get saveTimerIsRunning(): boolean {
        return Boolean(this.saveTimer);
    }

    private startSaveTimer(): void {
        this.saveTimer = setTimeout(() => {
            this.save().then(() => {
                this.unmodify();
            }).catch(error => {
                throw new Error(stripIndent`
                    There was an error saving a game object's document after it was modified.

                    Game object: ${this.debugString}
                    
                    ${error}
                `);
            });
        }, this.saveDelay);
    }

    private stopSaveTimer(): void {
        if (this.saveTimer) {
            clearTimeout(this.saveTimer);
            this.saveTimer = undefined;
        }
    }

    // Meant to be called whenever changes are made to the game object
    protected modify(): void {
        if (!this.modifiedSinceLastSave) {
            this.modifiedSinceLastSave = true;

            if (!this.saveTimerIsRunning) {
                this.startSaveTimer();
            }
        }
    }

    private unmodify(): void {
        this.modifiedSinceLastSave = false;

        this.stopSaveTimer();
    }

    protected setDocumentField(fieldName: string, value: unknown): void {
        if (!(fieldName in this.schemaDefinition)) {
            throw new Error(stripIndent`
                Invalid field name used in game object field setter.

                Field name: ${fieldName}
                Game object: ${this.debugString}
            `);
        }

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

        this.modify();

        this.document.set(fieldName, value);
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

    private async saveDocument(): Promise<void> {
        try {
            await this.document.save();
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error saving a game object's document.

                Document: ${this.document.toString()}
                
                ${error}
            `);
        }
    }

    public async save(): Promise<void> {
        try {
            await this.saveDocument();
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error saving a game object's document before unmodifying it.
                
                ${error}
            `);
        }
    }

    // This should only be called after the game object has been properly removed from the game
    public async delete(): Promise<void> {
        this.stopSaveTimer();

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
        `;
    }
}