import mongoose, { Schema, Types } from "mongoose";

import DocumentWrapper from "../structures/DocumentWrapper";

// The schema for a pending species submission
export const pendingSpeciesSchema = new Schema({
    commonNames: {
        type: [String],
        required: true,
    },
    commonNamesLower: {
        type: [String],
        required: true
    },
    scientificName: {
        type: String,
        required: true,
    },
    images: {
        type: [String],
        required: false,
    },
    description: {
        type: String,
        required: false,
    },
    naturalHabitat: {
        type: String,
        required: false,
    },
    wikiPage: {
        type: String,
        required: false,
    },
    author: {
        type: String,
        required: true
    }
});

export const PendingSpeciesModel = mongoose.model("PendingSpecies", pendingSpeciesSchema);

// The object representation of a species submission pending approval
export class PendingSpecies extends DocumentWrapper {
    constructor(documentId: Types.ObjectId) {
        super(PendingSpeciesModel, documentId);
    }

    public get commonNames(): string[] {
        return this.document.get("commonNames");
    }

    public get scientificName(): string {
        return this.document.get("scientificName");
    }

    public get images(): string[] | undefined {
        return this.document.get("images");
    }

    public get description(): string | undefined {
        return this.document.get("description");
    }

    public get naturalHabitat(): string | undefined {
        return this.document.get("naturalHabitat");
    }

    public get wikiPage(): string | undefined {
        return this.document.get("wikiPage");
    }

    public get authorId(): string {
        return this.document.get("author");
    }
}