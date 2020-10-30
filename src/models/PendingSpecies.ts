import mongoose, { Schema } from "mongoose";
import GameObject from "../structures/GameObject";

export class PendingSpecies extends GameObject {
    public readonly model = PendingSpeciesModel;

    public static readonly fieldNames = {
        commonNames: "commonNames",
        commonNamesLower: "commonNamesLower",
        scientificName: "scientificName",
        images: "images",
        description: "description",
        naturalHabitat: "naturalHabitat",
        wikiPage: "wikiPage",
        author: "author"
    };

    public get commonNames(): string[] {
        return this.document.get(PendingSpecies.fieldNames.commonNames);
    }

    public get scientificName(): string {
        return this.document.get(PendingSpecies.fieldNames.scientificName);
    }

    public get images(): string[] | undefined {
        return this.document.get(PendingSpecies.fieldNames.images);
    }

    public get description(): string | undefined {
        return this.document.get(PendingSpecies.fieldNames.description);
    }

    public get naturalHabitat(): string | undefined {
        return this.document.get(PendingSpecies.fieldNames.naturalHabitat);
    }

    public get wikiPage(): string | undefined {
        return this.document.get(PendingSpecies.fieldNames.wikiPage);
    }

    public get authorId(): string {
        return this.document.get(PendingSpecies.fieldNames.author);
    }
}

const pendingSpeciesSchema = new Schema({
    [PendingSpecies.fieldNames.commonNames]: {
        type: [String],
        required: true,
    },
    [PendingSpecies.fieldNames.commonNamesLower]: {
        type: [String],
        required: true
    },
    [PendingSpecies.fieldNames.scientificName]: {
        type: String,
        required: true,
    },
    [PendingSpecies.fieldNames.images]: {
        type: [String],
        required: false,
    },
    [PendingSpecies.fieldNames.description]: {
        type: String,
        required: false,
    },
    [PendingSpecies.fieldNames.naturalHabitat]: {
        type: String,
        required: false,
    },
    [PendingSpecies.fieldNames.wikiPage]: {
        type: String,
        required: false,
    },
    [PendingSpecies.fieldNames.author]: {
        type: String,
        required: true
    }
});

export const PendingSpeciesModel = mongoose.model("PendingSpecies", pendingSpeciesSchema);