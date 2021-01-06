import { DMChannel, TextChannel } from "discord.js";
import { Species } from "../structures/GameObject/GameObjects/Species";
import EDocMessage from "./EDocMessage";
import { EDoc, } from "../structures/eDoc/EDoc";
import { capitalizeFirstLetter } from "../utility/arraysAndSuch";
import BeastiaryClient from "../bot/BeastiaryClient";

export default class SpeciesEditMessage extends EDocMessage {
    constructor(channel: TextChannel | DMChannel, beastiaryClient: BeastiaryClient, speciesObject: Species) {
        const eDoc = new EDoc({
            [Species.fieldNames.commonNames]: {
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
                            alias: "name",
                            prompt: "Enter a name that is used to refer to this animal conversationally (e.g. \"dog\", \"cat\", \"bottlenose dolphin\"):"
                        },
                        article: {
                            type: String,
                            required: true,
                            alias: "article",
                            prompt: "Enter the grammatical article (a, an, etc.) that precedes this name:"
                        }
                    },
                    alias: "common name",
                    documentOptions: {
                        displayField: "name"
                    }
                }],
                required: true,
                alias: "common names",
                arrayOptions: {
                    viewportSize: 10
                }
            },
            [Species.fieldNames.scientificName]: {
                type: String,
                required: true,
                alias: "scientific name",
                prompt: "Enter this animal's scientific (taxonomical) name:",
                stringOptions: {
                    forceCase: "lower"
                }
            },
            [Species.fieldNames.cards]: {
                type: [{
                    type: {
                        _id: {
                            type: String,
                            required: false,
                            hidden: true
                        },
                        url: {
                            type: String,
                            required: true,
                            alias: "url",
                            prompt: "Enter a valid imgur link to this species' card. Must be a direct link to the card's image (e.g. \"i.imgur.com/fake-image\"):"
                        },
                        rarity: {
                            type: Number,
                            required: true,
                            alias: "rarity",
                            prompt: "Enter the weighted rarity for this card:"
                        },
                        breed: {
                            type: String,
                            required: false,
                            alias: "breed",
                            prompt: "Enter the breed of the animal depicted in this card, if one is apparent:"
                        },
                        special: {
                            type: String,
                            required: false,
                            alias: "special",
                            prompt: "Enter any special information associated with this card:"
                        }
                    },
                    alias: "card",
                    documentOptions: {
                        displayField: "url"
                    }
                }],
                required: true,
                alias: "cards",
                arrayOptions: {
                    viewportSize: 10
                }
            },
            [Species.fieldNames.description]: {
                type: String,
                required: true,
                alias: "description",
                prompt: "Enter a concise description of the animal (see other animals for examples):"
            },
            [Species.fieldNames.naturalHabitat]: {
                type: String,
                required: false,
                alias: "natural habitat",
                prompt: "Enter a concise summary of where the animal is naturally found (see other animals for examples):"
            },
            [Species.fieldNames.wikiPage]: {
                type: String,
                required: true,
                alias: "Wikipedia page",
                prompt: "Enter the link that leads to this animal's page on Wikipedia:"
            },
            [Species.fieldNames.rarityTier]: {
                type: Number,
                required: true,
                alias: "rarity tier",
                prompt: "Enter this animal's rarity tier:"
            },
            [Species.fieldNames.token]: {
                type: String,
                required: true,
                alias: "token",
                prompt: "Enter the item that this species can drop:"
            }
        });

        // Assign common names (with id being converted to a string)
        const commonNamesField = eDoc.getField(Species.fieldNames.commonNames);
        const commonNames = speciesObject.commonNameObjects;
        commonNames.forEach(commonName => {
            commonNamesField.push({
                _id: commonName._id ? String(commonName._id) : undefined,
                name: commonName.name,
                article: commonName.article
            })
        });

        // Same deal with cards
        const cardsField = eDoc.getField(Species.fieldNames.cards);
        speciesObject.cards.forEach(card => {
            cardsField.push({
                _id: card._id ? String(card._id) : undefined,
                url: card.url,
                rarity: card.rarity || 1,
                breed: card.breed,
                special: card.special
            });
        });

        eDoc.setField(Species.fieldNames.scientificName, speciesObject.scientificName);
        eDoc.setField(Species.fieldNames.description, speciesObject.description);
        eDoc.setField(Species.fieldNames.naturalHabitat, speciesObject.naturalHabitat);
        eDoc.setField(Species.fieldNames.wikiPage, speciesObject.wikiPage);
        eDoc.setField(Species.fieldNames.rarityTier, speciesObject.rarityTier);
        eDoc.setField(Species.fieldNames.token, speciesObject.token);

        super(channel, beastiaryClient, eDoc, capitalizeFirstLetter(speciesObject.commonNames[0]));
    }
}