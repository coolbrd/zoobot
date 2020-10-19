import { Document, Model, Types } from "mongoose";

// An object abstraction of a Mongoose document. Meant to be extended so documents can be easily treated as game objects.
export default class DocumentWrapper {
    // The model in which this wrapper's document can be found
    private readonly model: Model<Document>;

    // The id of the wrapper's document. Unchangeable and always set.
    public readonly id: Types.ObjectId;

    // The document object that corresponds to this object's id
    private _document: Document | undefined;

    constructor(document: Document, model: Model<Document>) {
        this.model = model;
        this._document = document;
        this.id = document._id;
    }

    // Gets this wrapper's document. Only to be used after it's been loaded.
    protected get document(): Document {
        // Don't try to do anything if the document isn't loaded yet
        if (!this._document) {
            throw new Error("A DocumentWrapper's document was attempted to be accessed before it was loaded.");
        }

        return this._document;
    }

    private setDocument(document: Document | undefined): void {
        this._document = document;
    }

    // Whether or not this wrapper's document has been loaded
    public get documentLoaded(): boolean {
        return Boolean(this._document);
    }

    // Whether or not all fields of this wrapper are loaded. Meant to be extended.
    public get fullyLoaded(): boolean {
        return this.documentLoaded;
    }

    // Loads this wrapper object's document by its id
    public async loadDocument(): Promise<void> {
        // Save time and don't do anything if it's already loaded
        if (this.documentLoaded) {
            return;
        }

        // Get the wrapper's document by its id
        let document: Document | null;
        try {
            document = await this.model.findById(this.id);
        }
        catch (error) {
            throw new Error(`There was an error loading a DocumentWrapper's document: ${error}`);
        }

        // If the id is invalid
        if (!document) {
            throw new Error("Nothing was found when a DocumentWrapper tried to load it's document.");
        }

        // Assign the new document
        this.setDocument(document);
    }

    // Loads all unloaded fields of the wrapper. Meant to be extended.
    public async load(): Promise<void> {
        try {
            await this.loadDocument();
        }
        catch (error) {
            throw new Error(`There was an error loading a DocumentWrapper's document: ${error}`);
        }
    }

    // Unloads all of this wrapper's information. Meant to be extended.
    protected unload(): void {
        this.setDocument(undefined);
    }

    // Reloads all the document's fields
    // Used if something was likely to have changed about the document in the database, and the most current data is desired
    public async refresh(): Promise<void> {
        // Unload and load all fields
        this.unload();

        try {
            await this.load();
        }
        catch (error) {
            throw new Error(`There was an error loading a document wrapper's information during a refresh: ${error}`);
        }
    }

    // Refreshes just this wrapper's document without reloading all other associated fields. Only useful for subclasses of this class.
    protected async refreshDocument(): Promise<void> {
        this.unload();

        try {
            await this.loadDocument();
        }
        catch (error) {
            throw new Error(`There was an error loading a DocumentWrapper's document in the refresh document method: ${error}`);
        }
    }

    // Deletes the document from the database
    public async delete(): Promise<void> {
        try {
            await this.document.deleteOne();
        }
        catch (error) {
            throw new Error(`There was an error deleting a document wrapper's document: ${error}`);
        }

        this.unload();
    }
}