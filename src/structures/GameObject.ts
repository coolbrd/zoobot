import { Document, Model, Types } from "mongoose";

// An object abstraction of a Mongoose document. Meant to be extended so documents can be easily treated as game objects.
export default abstract class GameObject {
    // The model in which this object's document can be found
    public readonly abstract model: Model<Document>;

    // The document wrapped by this game object
    protected readonly document: Document;

    // The id of the object's document. Unchangeable and always set.
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

    // Marks the game object as being modified after the most recent save period
    protected modify(): void {
        // If this is the first change to be made since the last save
        if (!this.modified) {
            // Save the document in 10 seconds
            this.saveTimer = setTimeout(() => {
                this.save();
            }, this.saveDelay);

            // Mark the document as modified
            this.modified = true;
        }
    }

    // Marks the game object as no longer being modified
    private unmodify(): void {
        // Mark the game object as unmodified since the last save period
        this.modified = false;

        // Clear the timer and unset it
        this.saveTimer && clearTimeout(this.saveTimer);
        this.saveTimer = undefined;
    }

    // Sets a field within this game object's document. Meant to be called instead of document.set()
    protected setField(fieldName: string, value: unknown): void {
        this.modify();
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

        console.log(`Saved ${this.id}`);

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