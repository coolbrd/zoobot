import { stripIndent } from "common-tags";
import { MessageEmbed } from "discord.js";
import Command, { CommandSection } from "../structures/Command/Command";
import { GuildCommandParser } from "../structures/Command/CommandParser";
import { betterSend, safeDeleteMessage } from "../discordUtility/messageMan";
import { PendingSpeciesModel } from "../models/PendingSpecies";
import PendingSpecies from "../structures/GameObject/GameObjects/PendingSpecies";
import reactionInput from "../discordUtility/reactionInput";
import { arrayToLowerCase } from "../utility/arraysAndSuch";
import { EDoc, SimpleEDoc } from "../structures/eDoc/EDoc";
import EDocMessage from "../messages/EDocMessage";
import CommandReceipt from "../structures/Command/CommandReceipt";
import BeastiaryClient from "../bot/BeastiaryClient";
import { inspect } from "util";

class SubmitSpeciesCommand extends Command {
    public readonly names = ["submitspecies", "submit"];

    public readonly info = "Submit a new species to The Beastiary";

    public readonly helpUseString = "to begin the species submission process.";

    public readonly sections = [CommandSection.getInvolved];

    public async run(parsedMessage: GuildCommandParser, beastiaryClient: BeastiaryClient): Promise<CommandReceipt> {
        const commandReceipt = this.newReceipt();
        
        const infoEmbed = new MessageEmbed();

        infoEmbed.setTitle("New species submission");
        infoEmbed.setDescription(stripIndent`
            You're about to begin the process of submitting a new animal species to The Beastiary.
            Please read over the following fields and prepare your submissions for them in advance.
        `);
        infoEmbed.addField("Common name(s)", "The names used to refer to the animal in everyday speech. E.g. \"raven\", \"bottlenose dolphin\".\n**One required**");
        infoEmbed.addField("Scientific name", "The taxonomical name of the animal. If the animal's common name refers to multiple species, pick the most relevant one.\n**Required**");
        infoEmbed.addField("Image(s)", "Pictures used to clearly depict the animal's appearance. Direct Imgur links only, e.g. \"i.imgur.com/fake-image\".");
        infoEmbed.addField("Description", "A brief description of the animal's appearance, attributes, and behaviors.");
        infoEmbed.addField("Natural habitat", "A brief description of the animal's natural environment, both in ecological traits and geographic location.");
        infoEmbed.addField("Wikipedia page", "The link to the animal's species' wikipedia page.");
        infoEmbed.setFooter({  text: "Press the reaction button to initiate the submission process when you're ready." })

        const infoMessage = await betterSend(parsedMessage.channel, infoEmbed);

        if (!infoMessage) {
            throw new Error(stripIndent`
                Unable to send the initial species submission message.

                Parsed message: ${inspect(parsedMessage)}
            `);
        }

        let reactionConfirmed: string | undefined;
        try {
            reactionConfirmed = await reactionInput(infoMessage, 60000, ["✅"]);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error getting the reaction input on a message.

                Info message: ${inspect(infoMessage)}
                Parsed message: ${inspect(parsedMessage)}
                
                ${error}
            `);
        }

        if (!reactionConfirmed) {
            betterSend(parsedMessage.channel, "Your time to initiate the previous submission process has expired. Perform the submit command again to try again.");
            return commandReceipt;
        }

        safeDeleteMessage(infoMessage);

        const submissionDocument = new EDoc({
            [PendingSpecies.fieldNames.commonNames]: {
                type: [{
                    type: String,
                    alias: "common name",
                    stringOptions: {
                        maxLength: 96
                    }
                }],
                required: true,
                alias: "common names",
                prompt: "Enter a name that is used to refer to this animal conversationally (e.g. \"dog\", \"cat\", \"bottlenose dolphin\"):",
                arrayOptions: {
                    viewportSize: 10
                }
            },
            [PendingSpecies.fieldNames.scientificName]: {
                type: String,
                required: true,
                alias: "scientific name",
                prompt: "Enter this animal's scientific (taxonomical) name:",
                stringOptions: {
                    maxLength: 128,
                    forceCase: "lower"
                }
            },
            [PendingSpecies.fieldNames.images]: {
                type: [{
                    type: String,
                    alias: "url",
                    stringOptions: {
                        maxLength: 128
                    }
                }],
                alias: "images",
                prompt: "Enter a valid imgur link to a clear picture of the animal. Must be a direct link to the image (e.g. \"i.imgur.com/fake-image\"):",
                arrayOptions: {
                    viewportSize: 10
                }
            },
            [PendingSpecies.fieldNames.description]: {
                type: String,
                alias: "description",
                prompt: "Enter a concise description of the animal (see other animals for examples):",
                stringOptions: {
                    maxLength: 512
                }
            },
            [PendingSpecies.fieldNames.naturalHabitat]: {
                type: String,
                alias: "natural habitat",
                prompt: "Enter a concise summary of where the animal is naturally found (see other animals for examples):",
                stringOptions: {
                    maxLength: 512
                }
            },
            [PendingSpecies.fieldNames.wikiPage]: {
                type: String,
                alias: "Wikipedia page",
                prompt: "Enter the link that leads to this animal's page on Wikipedia:",
                stringOptions: {
                    maxLength: 256
                }
            }
        });

        const submissionMessage = new EDocMessage(parsedMessage.channel, beastiaryClient, submissionDocument, "new submission");
        try {
            await submissionMessage.send();
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error sending a new species submission message.

                Submission message: ${submissionMessage.debugString}
                
                ${error}
            `);
        }

        submissionMessage.once("timeExpired", () => {
            betterSend(parsedMessage.channel, "Time limit expired, nothing submitted.");
        });
        
        submissionMessage.once("exit", () => {
            betterSend(parsedMessage.channel, "Submission cancelled.");
        });

        submissionMessage.once("submit", (finalDocument: SimpleEDoc) => {
            const pendingSpecies = new PendingSpeciesModel();

            pendingSpecies.set(PendingSpecies.fieldNames.commonNames, finalDocument[PendingSpecies.fieldNames.commonNames]);
            pendingSpecies.set(PendingSpecies.fieldNames.scientificName, finalDocument[PendingSpecies.fieldNames.scientificName]);
            pendingSpecies.set(PendingSpecies.fieldNames.images, finalDocument[PendingSpecies.fieldNames.images]);
            pendingSpecies.set(PendingSpecies.fieldNames.description, finalDocument[PendingSpecies.fieldNames.description]);
            pendingSpecies.set(PendingSpecies.fieldNames.naturalHabitat, finalDocument[PendingSpecies.fieldNames.naturalHabitat]);
            pendingSpecies.set(PendingSpecies.fieldNames.wikiPage, finalDocument[PendingSpecies.fieldNames.wikiPage]);

            pendingSpecies.set(PendingSpecies.fieldNames.commonNamesLower, arrayToLowerCase(pendingSpecies.get(PendingSpecies.fieldNames.commonNames)));

            pendingSpecies.set(PendingSpecies.fieldNames.author, parsedMessage.sender.id);

            pendingSpecies.save().then(() => {
                betterSend(parsedMessage.channel, "Submission accepted. Thanks for contributing to The Beastiary!");
            }).catch(error => {
                throw new Error(stripIndent`
                    There was an error saving a new pending species document.

                    Pending species document: ${pendingSpecies.toString()}
                    
                    ${error}
                `);
            });
        });

        return commandReceipt;
    }
}
export default new SubmitSpeciesCommand();