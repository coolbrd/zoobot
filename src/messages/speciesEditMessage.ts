import { DMChannel, TextChannel } from 'discord.js';

import EditableDocumentMessage from './editableDocumentMessage';
import EditableDocument, { schemaToSkeleton } from '../structures/editableDocument';
import { SpeciesObject, speciesSchema } from '../models/species';
import InteractiveMessageHandler from '../interactiveMessage/interactiveMessageHandler';

export class SpeciesEditMessage extends EditableDocumentMessage {
    constructor(handler: InteractiveMessageHandler, channel: TextChannel | DMChannel, speciesObject: SpeciesObject) {
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

        editSkeleton['commonNames'].value = speciesObject.getCommonNames();
        editSkeleton['article'].value = speciesObject.getArticle();
        editSkeleton['scientificName'].value = speciesObject.getScientificName();
        editSkeleton['description'].value = speciesObject.getDescription();
        editSkeleton['naturalHabitat'].value = speciesObject.getNaturalHabitat();
        editSkeleton['wikiPage'].value = speciesObject.getWikiPage();
        editSkeleton['rarity'].value = speciesObject.getRarity();
        
        super(handler, channel, new EditableDocument(editSkeleton), speciesObject.getCommonNames()[0]);

        this.setEmbed(this.buildEmbed());
    }
}