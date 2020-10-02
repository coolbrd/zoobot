import { DMChannel, TextChannel, User } from 'discord.js';

import InteractiveMessageHandler from '../interactiveMessage/interactiveMessageHandler';
import { PendingSpeciesObject } from '../models/pendingSpecies';
import { EDoc } from '../structures/eDoc';
import EDocMessage from './eDocMessage';

export class SpeciesApprovalMessage extends EDocMessage {
    private pendingSpeciesObject: PendingSpeciesObject;

    constructor(handler: InteractiveMessageHandler, channel: TextChannel | DMChannel, pendingSpeciesObject: PendingSpeciesObject) {
        const eDoc = new EDoc({
            commonNames: {
                type: [{
                    type: {
                        name: {
                            type: String,
                            required: true,
                            alias: 'name',
                            prompt: 'Enter a name that is used to refer to this animal conversationally (e.g. "dog", "cat", "bottlenose dolphin"):'
                        },
                        article: {
                            type: String,
                            required: true,
                            alias: 'article',
                            prompt: 'Enter the grammatical article (a, an, etc.) that precedes this name:'
                        }
                    },
                    alias: 'common name',
                    documentOptions: {
                        displayField: 'name'
                    }
                }],
                required: true,
                alias: 'common names'
            },
            scientificName: {
                type: String,
                required: true,
                alias: 'scientific name',
                prompt: 'Enter this animal\'s scientific (taxonomical) name:'
            },
            images: {
                type: [{
                    type: {
                        url: {
                            type: String,
                            required: true,
                            alias: 'url',
                            prompt: 'Enter a valid imgur link to a clear picture of the animal. Must be a direct link to the image (e.g. "i.imgur.com/fake-image"):'
                        },
                        breed: {
                            type: String,
                            required: false,
                            alias: 'breed',
                            prompt: 'Enter the breed of the animal depicted in this image, if one is apparent:'
                        }
                    },
                    alias: 'image',
                    documentOptions: {
                        displayField: 'url'
                    }
                }],
                required: true,
                alias: 'images'
            },
            description: {
                type: String,
                required: true,
                alias: 'description',
                prompt: 'Enter a concise description of the animal (see other animals for examples):'
            },
            naturalHabitat: {
                type: String,
                required: true,
                alias: 'natural habitat',
                prompt: 'Enter a concise summary of where the animal is naturally found (see other animals for examples):'
            },
            wikiPage: {
                type: String,
                required: true,
                alias: 'Wikipedia page',
                prompt: 'Enter the link that leads to this animal\'s page on Wikipedia:'
            },
            rarity: {
                type: Number,
                required: true,
                alias: 'rarity',
                prompt: 'Enter this animal\'s weighted rarity:'
            }
        });

        const commonNamesField = eDoc.getField('commonNames');
        for (const commonName of pendingSpeciesObject.getCommonNames()) {
            commonNamesField.push({
                name: commonName
            });
        }

        eDoc.setField('scientificName', pendingSpeciesObject.getScientificName());
        
        const imagesField = eDoc.getField('images');
        const imageUrls = pendingSpeciesObject.getImages();
        if (imageUrls) {
            for (const url of imageUrls) {
                imagesField.push({
                    url: url
                });
            }
        }

        eDoc.setField('description', pendingSpeciesObject.getDescription());
        eDoc.setField('naturalHabitat', pendingSpeciesObject.getNaturalHabitat());
        eDoc.setField('wikiPage', pendingSpeciesObject.getWikiPage());

        super(handler, channel, eDoc);

        this.pendingSpeciesObject = pendingSpeciesObject;

        this.addButton({
            name: 'deny',
            emoji: '⛔',
            helpMessage: 'Deny'
        });
    }

    public async buttonPress(buttonName: string, user: User): Promise<void> {
        super.buttonPress(buttonName, user);

        if (buttonName === 'deny') {
            await this.pendingSpeciesObject.delete();

            this.emit('deny');

            this.deactivate();
        }
    }
}