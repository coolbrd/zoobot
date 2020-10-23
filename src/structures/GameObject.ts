import { Document, Model, Types } from "mongoose";

// An object abstraction of a Mongoose document. Meant to be extended so documents can be easily treated as game objects.
export default abstract class GameObject {
    // The model in which this object's document can be found
    public readonly abstract model: Model<Document>;

    // The document object that corresponds to this object's id
    private _document: Document | undefined;

    // The id of the object's document. Unchangeable and always set.
    public readonly id: Types.ObjectId;

    constructor(document: Document) {
        this._document = document;
        this.id = document._id;
    }

    // Gets this object's document. Only to be used after it's been loaded.
    protected get document(): Document {
        if (!this._document) {
            throw new Error("A game object's document was attempted to be accessed before it was loaded.");
        }

        return this._document;
    }

    private setDocument(document: Document | undefined): void {
        this._document = document;
    }

    // Whether or not this object's document has been loaded
    public get documentLoaded(): boolean {
        return Boolean(this._document);
    }

    // Whether or not all fields of this object are loaded. Meant to be extended.
    public get fullyLoaded(): boolean {
        return this.documentLoaded;
    }

    // Loads this object's document by its id
    public async loadDocument(): Promise<void> {
        // Save time and don't do anything if it's already loaded
        if (this.documentLoaded) {
            return;
        }

        // Get the object's document by its id
        let document: Document | null;
        try {
            document = await this.model.findById(this.id);
        }
        catch (error) {
            throw new Error(`There was an error loading a game object's document: ${error}`);
        }

        // If the id is invalid
        if (!document) {
            throw new Error("Nothing was found when a game object tried to load it's document.");
        }

        // Assign the new document
        this.setDocument(document);
    }

    // Loads all unloaded fields of the object. Meant to be extended.
    public async load(): Promise<void> {
        try {
            await this.loadDocument();
        }
        catch (error) {
            throw new Error(`There was an error loading a game object's document: ${error}`);
        }
    }

    // Unloads all of this object's information. Meant to be extended.
    protected unload(): void {
        this.setDocument(undefined);
    }

    // Reloads all the object's fields
    // Used if something was likely to have changed about the document in the database, and the most current data is desired
    public async refresh(): Promise<void> {
        // Unload and load all fields
        this.unload();

        try {
            await this.load();
        }
        catch (error) {
            throw new Error(`There was an error loading a game object's information during a refresh: ${error}`);
        }
    }

    // Refreshes just this object's document without reloading all other associated fields. Only useful for subclasses of this class.
    protected async refreshDocument(): Promise<void> {
        this.unload();

        try {
            await this.loadDocument();
        }
        catch (error) {
            throw new Error(`There was an error loading a game object's document in the refresh document method: ${error}`);
        }
    }

    // Used to commit any final changes before this object is unloaded. Meant to be extended.
    public async finalize(): Promise<void> {
        return;
    }

    // Deletes the object's document from the database. Meant to be called exclusively in tandem with other methods that remove the object from the game.
    public async delete(): Promise<void> {
        try {
            await this.document.deleteOne();
        }
        catch (error) {
            throw new Error(`There was an error deleting a game object's document: ${error}`);
        }

        this.unload();
    }
}