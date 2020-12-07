import { Document } from "mongoose";
import Command from "../structures/Command/Command";
import CommandParser from "../structures/Command/CommandParser";
import { PendingSpeciesModel } from "../models/PendingSpecies";
import PendingSpecies from "../structures/GameObject/GameObjects/PendingSpecies";
import { betterSend } from "../discordUtility/messageMan";
import { SpeciesModel } from "../models/Species";
import SpeciesApprovalMessage from "../messages/SpeciesApprovalMessage";
import { SimpleEDoc } from "../structures/eDoc/EDoc";
import { commonNamesToLowerArray, CommonNameTemplate } from '../structures/GameObject/GameObjects/Species';
import { stripIndent } from "common-tags";
import CommandReceipt from "../structures/Command/CommandReceipt";
import BeastiaryClient from "../bot/BeastiaryClient";

class ApprovePendingSpeciesCommand extends Command {
    public readonly commandNames = ["approve", "approvespecies"];

    public readonly info = "Review and approve a pending species";

    public readonly helpUseString = "`<pending species name>` to begin the process of reviewing and approving a species submission.";

    public readonly adminOnly = true;

    public async run(parsedMessage: CommandParser, commandReceipt: CommandReceipt, beastiaryClient: BeastiaryClient): Promise<CommandReceipt> {
        const fullSearchTerm = parsedMessage.restOfText.toLowerCase();

        if (!fullSearchTerm) {
            betterSend(parsedMessage.channel, this.help(parsedMessage.displayPrefix, parsedMessage.commandChain));
            return commandReceipt;
        }

        let pendingSpeciesDocument: Document | null;
        try {
            pendingSpeciesDocument = await PendingSpeciesModel.findOne({ [PendingSpecies.fieldNames.commonNamesLower]: fullSearchTerm });
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error trying to find a pending species document in the database.

                Search term: ${fullSearchTerm}
                
                ${error}
            `);
        }

        if (!pendingSpeciesDocument) {
            betterSend(parsedMessage.channel, `No pending species submission with the common name "${fullSearchTerm}" could be found.`);
            return commandReceipt;
        }

        const pendingSpeciesObject = new PendingSpecies(pendingSpeciesDocument, beastiaryClient);

        const approvalMessage = new SpeciesApprovalMessage(parsedMessage.channel, beastiaryClient, pendingSpeciesObject);

        try {
            await approvalMessage.send();
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error attempting to send a species approval message.

                Message: ${approvalMessage.debugString}
                
                ${error}
            `);
        }

        approvalMessage.once("timeExpired", () => {
            betterSend(parsedMessage.channel, "Time limit expired.");
        });

        approvalMessage.once("exit", () => {
            betterSend(parsedMessage.channel, "Approval process aborted.");
        });

        approvalMessage.once("deny", () => {
            betterSend(parsedMessage.channel, "Submission denied.");
        });

        approvalMessage.once("submit", (finalDocument: SimpleEDoc) => {
            const speciesDocument = new SpeciesModel(finalDocument);

            const commonNames = finalDocument[PendingSpecies.fieldNames.commonNames] as unknown as CommonNameTemplate[];
            const commonNamesLower = commonNamesToLowerArray(commonNames);
            
            speciesDocument.set(PendingSpecies.fieldNames.commonNamesLower, commonNamesLower);

            speciesDocument.save().then(() => {
                betterSend(parsedMessage.channel, "Species approved.");

                beastiaryClient.beastiary.species.refreshSpecies().catch(error => {
                    throw new Error(stripIndent`
                        There was an error reloading the species rarity table after adding a new species.
                        
                        ${error}
                    `);
                });

                pendingSpeciesObject.delete().catch(error => {
                    throw new Error(stripIndent`
                        There was an error attempting to delete a newly approved pending species from the database.

                        Pending species: ${pendingSpeciesObject.debugString}
                        
                        ${error}
                    `);
                });
            }).catch(error => {
                throw new Error(stripIndent`
                    There was an error attempting to save a newly approved species to the database.

                    Species document: ${speciesDocument.toString()}
                    
                    ${error}
                `);
            });
        });

        return commandReceipt;
    }
}
export default new ApprovePendingSpeciesCommand();