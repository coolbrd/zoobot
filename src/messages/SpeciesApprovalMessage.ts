import { DMChannel, TextChannel, User } from "discord.js";
import { client } from "..";
import PendingSpecies from "../structures/GameObject/GameObjects/PendingSpecies";
import { Species } from "../structures/GameObject/GameObjects/Species";
import { EDoc } from "../structures/eDoc/EDoc";
import EDocMessage from "./EDocMessage";
import { stripIndent } from "common-tags";

export default class SpeciesApprovalMessage extends EDocMessage {
    private pendingSpeciesObject: PendingSpecies;

    constructor(channel: TextChannel | DMChannel, pendingSpeciesObject: PendingSpecies) {
        const eDoc = new EDoc({
            [Species.fieldNames.commonNames]: {
                type: [{
                    type: {
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
            [Species.fieldNames.rarity]: {
                type: Number,
                required: true,
                alias: "rarity",
                prompt: "Enter this animal's weighted rarity:"
            },
            [Species.fieldNames.token]: {
                type: String,
                required: true,
                alias: "token",
                prompt: "Enter the item that this species can drop:"
            }
        });

        // Get common names array and add it as an eDoc array
        const commonNamesField = eDoc.getField(Species.fieldNames.commonNames);
        for (const commonName of pendingSpeciesObject.commonNames) {
            commonNamesField.push({
                name: commonName
            });
        }
        
        // Get card url array and add is as an eDoc array
        const cardsField = eDoc.getField(Species.fieldNames.cards);
        const cardUrls = pendingSpeciesObject.images;
        if (cardUrls) {
            for (const url of cardUrls) {
                cardsField.push({
                    url: url,
                    rarity: 1
                });
            }
        }

        eDoc.setField(Species.fieldNames.scientificName, pendingSpeciesObject.scientificName);
        eDoc.setField(Species.fieldNames.description, pendingSpeciesObject.description);
        eDoc.setField(Species.fieldNames.naturalHabitat, pendingSpeciesObject.naturalHabitat);
        eDoc.setField(Species.fieldNames.wikiPage, pendingSpeciesObject.wikiPage);

        const authorUser = client.users.resolve(pendingSpeciesObject.authorId);
        let docName = "Submission";
        if (authorUser) {
            docName += ` by ${authorUser.tag}`;
        }

        super(channel, eDoc, docName);

        this.pendingSpeciesObject = pendingSpeciesObject;

        this.addButton({
            name: "deny",
            emoji: "⛔",
            helpMessage: "Deny"
        });
    }

    public async buttonPress(buttonName: string, user: User): Promise<void> {
        try {
            await super.buttonPress(buttonName, user);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error performing inherited button press information in a species approval message.
                
                ${error}
            `);
        }

        if (buttonName === "deny") {
            try {
                await this.pendingSpeciesObject.delete();
            }
            catch (error) {
                throw new Error(stripIndent`
                    There was an error deleting a denied pending species.

                    Pending species: ${this.pendingSpeciesObject.debugString}
                    
                    ${error}
                `);
            }
            
            this.emit("deny");
            this.deactivate();
        }
    }
}