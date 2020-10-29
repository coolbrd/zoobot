import { Document, Model, Types } from "mongoose";

// An object abstraction of a Mongoose document. Meant to be extended so documents can be easily treated as game objects.
export default abstract class GameObject {
    // The model in which this object's document can be found
    public readonly abstract model: Model<Document>;

    // The document wrapped by this game object
    protected readonly document: Document;

    // The id of the object's document
    public readonly id: Types.ObjectId;

    // Whether or not this game object's document has been modified since the last save
    private modified = false;
    // The timer responsible for saving the game object after some time
    private saveTimer: NodeJS.Timeout | undefined;
    // The amount of time that will pass between the object's first unsaved change and it being saved
    private saveDelay = 10000;

    constructor(document: Document) {
        this.document = document;
        this.id = document._id;
    }

    // Stops this game object's save timer
    private stopSaveTimer(): void {
        // Clear the timer and unset it
        this.saveTimer && clearTimeout(this.saveTimer);
        this.saveTimer = undefined;
    }

    // Resets this game object's save timer
    private startSaveTimer(): void {
        // Stop the timer first, preventing it from firing twice
        this.stopSaveTimer();

        // Save the document after a delay
        this.saveTimer = setTimeout(() => {
            this.save();
        }, this.saveDelay);
    }

    // Marks the game object as being modified after the most recent save period
    protected modify(): void {
        // If this is the first change to be made since the last save
        if (!this.modified) {
            // Set the game object to be saved after a delay
            this.startSaveTimer();

            // Mark the document as modified
            this.modified = true;
        }
    }

    // Marks the game object as no longer being modified
    private unmodify(): void {
        // Mark the game object as unmodified since the last save period
        this.modified = false;

        // Stop the save timer
        this.stopSaveTimer();
    }

    // Sets a field within this game object's document. Meant to be called in children instead of document.set
    protected setField(fieldName: string, value: unknown): void {
        // Marks this game object as having been modified
        this.modify();

        // Set the field
        this.document.set(fieldName, value);
    }

    // Loads/reloads all fields of the object. Meant to be extended.
    public async loadFields(): Promise<void> {
        return;
    }

    // Saves this game object's document to the database
    private async saveDocument(): Promise<void> {
        try {
            await this.document.save();
        }
        catch (error) {
            throw new Error(`There was an error saving a game object's document: ${error}`);
        }
    }

    // Saves the current version of the document to the database
    // There should only ever be one instance of any given document assigned to a game object at any time, so this shouldn't cause conflicts
    public async save(): Promise<void> {
        // Save the document to the database
        try {
            await this.saveDocument();
        }
        catch (error) {
            throw new Error(`There was an error saving a game object's document before unmodifying it: ${error}`);
        }

        // Mark the document as no longer having been modified since its last save
        this.unmodify();
    }

    // Deletes the object's document from the database. Meant to be called exclusively in tandem with other methods that remove the object from the game.
    public async delete(): Promise<void> {
        try {
            await this.document.deleteOne();
        }
        catch (error) {
            throw new Error(`There was an error deleting a game object's document: ${error}`);
        }
    }
}