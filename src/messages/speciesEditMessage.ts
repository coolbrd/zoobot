import { DMChannel, TextChannel } from 'discord.js';

import { SpeciesObject } from '../models/species';
import InteractiveMessageHandler from '../interactiveMessage/interactiveMessageHandler';
import EDocMessage from './eDocMessage';
import { EDoc, } from '../structures/eDoc';

export default class SpeciesEditMessage extends EDocMessage {
    constructor(handler: InteractiveMessageHandler, channel: TextChannel | DMChannel, speciesObject: SpeciesObject) {
        const eDoc = new EDoc({
            commonNames: {
                type: [{
                    type: {
                        _id: {
                            type: String,
                            required: false,
                            hidden: true
                        },
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
                alias: 'common names',
                arrayOptions: {
                    viewportSize: 10
                }
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
                alias: 'images',
                arrayOptions: {
                    viewportSize: 10
                }
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

        const commonNames = speciesObject.getCommonNameObjects();
        commonNames.forEach(commonName => {
            commonNamesField.push({
                _id: commonName._id ? String(commonName._id) : undefined,
                name: commonName.name,
                article: commonName.article
            })
        });

        console.log(eDoc);

        super(handler, channel, eDoc);
    }
}