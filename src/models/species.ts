import mongoose, { Schema, Document, Types } from 'mongoose';
import DocumentWrapper from '../structures/documentWrapper';
import { arrayToLowerCase } from '../utility/arraysAndSuch';

export const imageSubSchema = new Schema({
    url: {
        type: String,
        required: true
    },
    breed: {
        type: String,
        required: false
    }
});

export const speciesSchema = new Schema({
    commonNames: {
        type: Array,
        required: true
    },
    commonNamesLower: {
        type: Array,
        required: true
    },
    article: {
        type: String,
        required: true
    },
    scientificName: {
        type: String,
        required: true
    },
    images: {
        type: [imageSubSchema],
        required: true
    },
    description: {
        type: String,
        required: true
    },
    naturalHabitat: {
        type: String,
        required: true
    },
    wikiPage: {
        type: String,
        required: true
    },
    rarity: {
        type: Number,
        required: true
    }
});

export const Species = mongoose.model('Species', speciesSchema);

export interface ImageFieldsTemplate {
    _id?: Types.ObjectId,
    url?: string,
    breed?: string
}

// An object representing the subschema that's found within the array of images in a species document
export class ImageSubObject {
    private document: Document;
    private speciesObject: SpeciesObject;

    constructor(imageDocument: Document, speciesObject: SpeciesObject) {
        this.document = imageDocument;
        this.speciesObject = speciesObject;
    }

    public getId(): Types.ObjectId {
        return this.document._id;
    }

    public getUrl(): string {
        return this.document.get('url');
    }

    public getBreed(): string | undefined {
        return this.document.get('breed');
    }

    public async setFields(fields: ImageFieldsTemplate): Promise<void> {
        await Species.updateOne({
            _id: this.speciesObject.getId(),
            'images._id': this.document._id
        }, {
            'images.$.url': fields.url || this.getUrl(),
            'images.$.breed': fields.breed || this.getBreed() || ''
        });
    }

    // Gets this image's index in its parent species' list of images
    public getIndex(): number {
        const index = this.speciesObject.getImageDocuments().findIndex(imageDocument => {
            return this.getId().equals(imageDocument._id)
        });
        if (index === undefined) {
            throw new Error('A species image with no place in its species was found.');
        }
        return index;
    }
}

export interface SpeciesFieldsTemplate {
    commonNames?: string[],
    article?: string,
    scientificName?: string,
    images?: ImageFieldsTemplate[],
    description?: string,
    naturalHabitat?: string,
    wikiPage?: string,
    rarity?: number
}

// A simple, stripped-down object used for easier interfacing with species documents returned from Mongoose queries
export class SpeciesObject extends DocumentWrapper {
    private images: ImageSubObject[] | undefined;

    public getCommonNames(): string[] {
        return this.getDocument().get('commonNames');
    }

    public getArticle(): string {
        return this.getDocument().get('article');
    }

    public getScientificName(): string {
        return this.getDocument().get('scientificName');
    }

    public getImageDocuments(): Document[] {
        return this.getDocument().get('images');
    }

    public getDescription(): string {
        return this.getDocument().get('description');
    }

    public getNaturalHabitat(): string {
        return this.getDocument().get('naturalHabitat');
    }

    public getWikiPage(): string {
        return this.getDocument().get('wikiPage');
    }

    public getRarity(): number {
        return this.getDocument().get('rarity');
    }

    // Changes the fields of the species document and commits them to the database
    public async setFields(fields: SpeciesFieldsTemplate): Promise<void> {
        // Reload fields so default information is as current as possible
        await this.refresh();
        // Change the species' simple fields, using this object's default known value for unchanged fields
        await this.getDocument().updateOne({
            $set: {
                commonNames: fields.commonNames || this.getCommonNames(),
                commonNamesLower: arrayToLowerCase(fields.commonNames || this.getCommonNames()),
                article: fields.article || this.getArticle(),
                scientificName: fields.scientificName || this.getScientificName(),
                description: fields.description || this.getDescription(),
                naturalHabitat: fields.naturalHabitat || this.getNaturalHabitat(),
                wikiPage: fields.wikiPage || this.getWikiPage(),
                rarity: fields.rarity || this.getRarity()
            }
        });
        // Handle new/updated images if present
        if (fields.images) {
            // The list of images to update
            const updatedImages = fields.images;

            // Wait for this promise to complete
            await new Promise(resolve => {
                // Initiate the indicator of how many images have finished updating
                let completed = 0;
                // The function that will be called every time an image update finishes, resolves the promise if all images are updated
                const complete = () => {
                    if (++completed >= updatedImages.length) {
                        resolve();
                    }
                }
                // Iterate over every image to update
                for (const updatedImage of updatedImages) {
                    // If the image has an id associated with it (it's a change made to an existing image)
                    if (updatedImage._id) {
                        const existingImageId = updatedImage._id;
                        // Find the image to change
                        const imageToUpdate = this.getImages().find(imageObject => {
                            return imageObject.getId().equals(existingImageId);
                        });

                        // If not existing image was found
                        if (!imageToUpdate) {
                            throw new Error('An updated image object given to SpeciesObject.prototype.setFields does not map to any existing image of the species.');
                        }

                        // Update the image
                        imageToUpdate.setFields(updatedImage).then(() => {
                            complete();
                        });
                    }
                    // If no image id was provided (new image)
                    else {
                        // If no url was provided (a required field for new images)
                        if (!updatedImage.url) {
                            throw new Error('A new image (no id) with no url field was given to a species in setFields.');
                        }

                        // Add the new image to the species
                        this.getDocument().updateOne({
                            $push: {
                                images: {
                                    url: updatedImage.url,
                                    breed: updatedImage.breed
                                }
                            }
                        }).then(() => {
                            complete();
                        });
                    }
                }
            })
        }
    }

    public getImages(): ImageSubObject[] {
        if (!this.images) {
            throw new Error('Tried to get a species\'s images before they were loaded.');
        }

        return this.images;
    }

    public imagesLoaded(): boolean {
        return Boolean(this.images);
    }

    public fullyLoaded(): boolean {
        return super.fullyLoaded() && this.imagesLoaded();
    }

    // Loads this species' document
    public async loadDocument(): Promise<void> {
        // If the species' document is already known/loaded, do nothing
        if (this.documentLoaded()) {
            return;
        }

        // Find the species document and set it
        const speciesDocument = await Species.findById(this.getId());
        if (!speciesDocument) {
            throw new Error('No species document was found for an id given to a species object.');
        }
        this.setDocument(speciesDocument);
    }

    // Loads this species' image objects
    public loadImages(): void {
        if (!this.documentLoaded()) {
            throw new Error('A species\' images were attempted to be loaded before its document was.');
        }

        // If this species' images are already known/loaded, do nothing
        if (this.imagesLoaded()) {
            return;
        }

        // Get this species' images and add each of them as an object
        const imageSubObjects: ImageSubObject[] = [];
        this.getDocument().get('images').forEach((imageDocument: Document) => {
            imageSubObjects.push(new ImageSubObject(imageDocument, this));
        });
        this.images = imageSubObjects;
    }

    // Loads this species' data from the database
    public async load(): Promise<void> {
        // Don't load again if it's already loaded
        if (this.fullyLoaded()) {
            return;
        }

        // Don't finish/resolve this function until the document and images are loaded
        await this.loadDocument();
        this.loadImages();
    }

    // Unloads this species' data
    public unload(): void {
        super.unload();
        this.images = undefined;
    }
}