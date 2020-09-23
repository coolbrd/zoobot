import { DMChannel, TextChannel, User } from 'discord.js';
import { Document } from 'mongoose';

import EditableDocumentMessage from './editableDocumentMessage';
import EditableDocument, { EditableDocumentObjectSkeleton, schemaToSkeleton } from '../structures/editableDocument';
import { speciesSchema } from '../models/species';
import InteractiveMessageHandler from '../interactiveMessage/interactiveMessageHandler';

export class SpeciesApprovalMessage extends EditableDocumentMessage {
    private pendingSpecies: Document;

    constructor(handler: InteractiveMessageHandler, channel: TextChannel | DMChannel, pendingSpecies: Document) {
        const pendingSpeciesDocument = pendingSpecies;

        // Create the document skeleton for the approval document
        const approvalSkeleton = schemaToSkeleton(speciesSchema, {
            commonNames: {
                alias: 'common names'
            },
            article: {
                alias: 'article'
            },
            scientificName: {
                alias: 'scientific name'
            },
            images: {
                alias: 'images',
                arrayViewPortSize: 5,
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
            rarity: {
                alias: 'rarity'
            }
        });

        // Set known values that simply map to their pending species forms
        approvalSkeleton['commonNames'].value = pendingSpeciesDocument.get('commonNames');
        approvalSkeleton['scientificName'].value = pendingSpeciesDocument.get('scientificName');
        approvalSkeleton['description'].value = pendingSpeciesDocument.get('description');
        approvalSkeleton['naturalHabitat'].value = pendingSpeciesDocument.get('naturalHabitat');
        approvalSkeleton['wikiPage'].value = pendingSpeciesDocument.get('wikiPage');

        // Turn the images array into an array of objects that contain optional breed info
        const imageLinks: string[] = pendingSpeciesDocument.get('images');
        approvalSkeleton['images'].value = [] as EditableDocumentObjectSkeleton[];
        for (const link of imageLinks) {
            approvalSkeleton['images'].value.push({
                url: link
            });
        }
        
        super(handler, channel, new EditableDocument(approvalSkeleton), 'new submission');

        this.pendingSpecies = pendingSpecies;

        this.addButton({
            name: 'deny',
            emoji: '⛔',
            helpMessage: 'Deny'
        });

        this.setEmbed(this.buildEmbed());
    }

    public async buttonPress(buttonName: string, user: User): Promise<void> {
        super.buttonPress(buttonName, user);

        if (buttonName === 'deny') {
            this.pendingSpecies.deleteOne();

            this.emit('deny');
        }
    }
}