import { DMChannel, TextChannel } from 'discord.js';
import { Document } from 'mongoose';

import EditableDocumentMessage from './editableDocumentMessage';
import EditableDocument, { EditableDocumentObjectSkeleton, schemaToSkeleton } from '../structures/editableDocument';
import { speciesSchema } from '../models/species';
import InteractiveMessageHandler from '../interactiveMessage/interactiveMessageHandler';

export class SpeciesEditMessage extends EditableDocumentMessage {
    constructor(handler: InteractiveMessageHandler, channel: TextChannel | DMChannel, speciesDocument: Document) {
        // Create the document skeleton for the species
        const editSkeleton = schemaToSkeleton(speciesSchema, {
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
                    _id: {
                        alias: 'id'
                    },
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

        editSkeleton['commonNames'].value = speciesDocument.get('commonNames');
        editSkeleton['article'].value = speciesDocument.get('article');
        editSkeleton['scientificName'].value = speciesDocument.get('scientificName');
        editSkeleton['description'].value = speciesDocument.get('description');
        editSkeleton['naturalHabitat'].value = speciesDocument.get('naturalHabitat');
        editSkeleton['wikiPage'].value = speciesDocument.get('wikiPage');
        editSkeleton['rarity'].value = speciesDocument.get('rarity');

        const images: Document[] = speciesDocument.get('images');
        editSkeleton['images'].value = [] as EditableDocumentObjectSkeleton[];
        for (const image of images) {
            editSkeleton['images'].value.push({
                _id: image._id,
                url: image.get('url'),
                breed: image.get('breed')
            });
        }
        
        super(handler, channel, new EditableDocument(editSkeleton), speciesDocument.get('commonNames.0'));

        this.setEmbed(this.buildEmbed());
    }
}