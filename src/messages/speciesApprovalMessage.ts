import EditableDocumentMessage from './editableDocumentMessage';
import { DMChannel, TextChannel, User } from 'discord.js';
import EditableDocument, { EditableDocumentSkeletonValue, schemaToSkeleton } from '../utility/editableDocument';
import { Document } from 'mongoose';
import { PendingSpeciesDocument } from '../models/pendingSpecies';
import { speciesSchema } from '../models/species';

export class SpeciesApprovalMessage extends EditableDocumentMessage {
    private pendingSpecies: Document;

    constructor(channel: TextChannel | DMChannel, pendingSpecies: Document) {
        // Convert the species document to a plain object
        const pendingSpeciesDocument = pendingSpecies.toObject() as PendingSpeciesDocument;

        // Create the document skeleton for the approval document
        const approvalSkeleton = schemaToSkeleton(speciesSchema, {
            commonNames: {
                alias: 'common names'
            },
            scientificName: {
                alias: 'scientific name'
            },
            images: {
                alias: 'images',
                nestedInfo: {
                    url: {
                        alias: 'url'
                    },
                    breed: {
                        alias: 'breed'
                    }
                }
            },
            description: {
                alias: 'description'
            },
            naturalHabitat: {
                alias: 'natural habitat'
            },
            wikiPage: {
                alias: 'wikipedia page'
            },
            family: {
                alias: 'family'
            }
        });

        // Set known values that simply map to their pending species forms
        approvalSkeleton['commonNames'].value = pendingSpeciesDocument.commonNames;
        approvalSkeleton['scientificName'].value = pendingSpeciesDocument.scientificName;
        approvalSkeleton['description'].value = pendingSpeciesDocument.description;
        approvalSkeleton['naturalHabitat'].value = pendingSpeciesDocument.naturalHabitat;
        approvalSkeleton['wikiPage'].value = pendingSpeciesDocument.wikiPage;

        // Turn the images array into an array of objects that contain optional breed info
        const imageLinks: string[] = pendingSpeciesDocument.images;
        approvalSkeleton['images'].value = [] as EditableDocumentSkeletonValue[];
        for (const link of imageLinks) {
            approvalSkeleton['images'].value.push({
                url: link
            });
        }
        
        super(channel, new EditableDocument(approvalSkeleton), 'new submission');

        this.pendingSpecies = pendingSpecies;

        this.addButton({
            name: 'deny',
            emoji: '⛔',
            helpMessage: 'Deny'
        });
    }

    public async buttonPress(buttonName: string, user: User): Promise<void> {
        super.buttonPress(buttonName, user);

        if (buttonName === 'deny') {
            this.pendingSpecies.deleteOne();

            this.emit('deny');
        }
    }
}