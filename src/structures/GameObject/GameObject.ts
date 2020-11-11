import { Document, Model, Types } from "mongoose";
import gameConfig from "../../config/gameConfig";

export default abstract class GameObject {
    // The model in which the game object's representative documents are found
    public readonly abstract model: Model<Document>;

    protected readonly document: Document;
    public readonly id: Types.ObjectId;

    // The set of field names that are used to access data within this object's document
    public static readonly fieldNames: {[fieldName: string]: string};

    private modifiedSinceLastSave = false;
    private saveTimer: NodeJS.Timeout | undefined;
    private saveDelay = gameConfig.gameObjectSaveDelay;

    constructor(document: Document) {
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
                throw new Error(`There was an error saving a game object's document after it was modified: ${error}`);
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
        this.modify();

        this.document.set(fieldName, value);
    }

    // Placeholder for optionally extensible field loader method
    public async loadFields(): Promise<void> {
        return;
    }

    private async saveDocument(): Promise<void> {
        try {
            await this.document.save();
        }
        catch (error) {
            throw new Error(`There was an error saving a game object's document: ${error}`);
        }
    }

    public async save(): Promise<void> {
        try {
            await this.saveDocument();
        }
        catch (error) {
            throw new Error(`There was an error saving a game object's document before unmodifying it: ${error}`);
        }
    }

    // This should only be called after the game object has been properly removed from the game
    public async delete(): Promise<void> {
        this.stopSaveTimer();

        try {
            await this.document.deleteOne();
        }
        catch (error) {
            throw new Error(`There was an error deleting a game object's document: ${error}`);
        }
    }
}