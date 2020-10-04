import { Document, Types } from 'mongoose';

export default class DocumentWrapper {
    // The id of the wrapper's document. Unchangeable and always set.
    private readonly id: Types.ObjectId;

    // The document object that corresponds to this object's id. Loaded by request or on creation (if supplied)
    private document: Document | undefined;

    // At least one of these two fields is required. If the document is supplied, there's no need to supply the id.
    constructor(documentInfo: { documentId?: Types.ObjectId, document?: Document }) {
        // If the pre-loaded document has been supplied
        if (documentInfo.document) {
            this.id = documentInfo.document._id;
            this.document = documentInfo.document;
        }
        // If just the document's id is supplied
        else if (documentInfo.documentId) {
            this.id = documentInfo.documentId;
        }
        // If not enough information was provided (neither document nor id)
        else {
            throw new Error('Insufficient information provided for the creation of a DocumentWrapper.');
        }
    }

    public getId(): Types.ObjectId {
        return this.id;
    }

    // Gets this wrapper's document. Only to be used after it's been loaded.
    protected getDocument(): Document {
        // Don't try to do anything if the document isn't loaded yet
        if (!this.document) {
            throw new Error('A DocumentWrapper\'s document was attempted to be accessed before it was loaded.');
        }

        return this.document;
    }

    // Sets the wrapper's document to a given document. Only to be used in the loading process when no document is assigned. 
    protected setDocument(document: Document): void {
        // Don't set anything if there's already a document
        if (this.document) {
            throw new Error('A DocumentWrapper\'s document was attempted to be overridden before it was set to undefined.');
        }

        this.document = document;
    }

    // Whether or not this wrapper's document has been loaded
    public documentLoaded(): boolean {
        return Boolean(this.document);
    }

    // Whether or not all fields of this wrapper are loaded. Meant to be extended.
    public fullyLoaded(): boolean {
        return this.documentLoaded();
    }

    // Loads all unloaded fields of the wrapper. Meant to be extended.
    public async load(): Promise<void> {
        if (this.fullyLoaded()) {
            return;
        }
    }

    // Unloads all of this wrapper's information. Meant to be extended.
    protected unload(): void {
        this.document = undefined;
    }

    // Reloads all the document's fields
    // Used if something was likely to have changed about the document in the database, and the most current data is desired
    public async refresh(): Promise<void> {
        this.unload();
        await this.load();
    }

    // Deletes the wrapped document from the database
    public async delete(): Promise<void> {
        try {
            await this.getDocument().deleteOne();
        }
        catch (error) {
            throw new Error('There was an error deleting a document wrapper\'s document.');
        }

        this.unload();
    }
}