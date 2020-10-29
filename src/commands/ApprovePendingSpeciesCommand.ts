import { Document } from "mongoose";
import Command from "../structures/Command";
import CommandParser from "../structures/CommandParser";
import { PendingSpeciesModel, PendingSpecies } from "../models/PendingSpecies";
import { betterSend } from "../discordUtility/messageMan";
import { commonNamesToLower, CommonNameTemplate, SpeciesModel } from "../models/Species";
import SpeciesApprovalMessage from "../messages/SpeciesApprovalMessage";
import { SimpleEDoc } from "../structures/EDoc";
import { encounterHandler } from "../beastiary/EncounterHandler";

// The command used to review, edit, and approve a pending species into a real species
export default class ApprovePendingSpeciesCommand extends Command {
    public readonly commandNames = ["approve", "approvespecies"];

    public readonly info = "Review and approve a pending species";

    public readonly adminOnly = true;

    public help(commandPrefix: string): string {
        return `Use \`${commandPrefix}${this.commandNames[0]}\` \`<pending species name>\` to begin the process of reviewing and approving a species submission.`;
    }

    public async run(parsedMessage: CommandParser): Promise<void> {
        const fullSearchTerm = parsedMessage.fullArguments.toLowerCase();

        // If no arguments were provided
        if (!fullSearchTerm) {
            betterSend(parsedMessage.channel, this.help(parsedMessage.displayPrefix));
            return;
        }

        // Get a pending species whose first common name is the search term
        let pendingSpeciesDocument: Document | null;
        try {
            pendingSpeciesDocument = await PendingSpeciesModel.findOne({ [PendingSpecies.fieldNames.commonNamesLower]: fullSearchTerm });
        }
        catch (error) {
            throw new Error(`There was an error trying to find a pending species document in the database: ${error}`);
        }

        // If nothing was found by that name
        if (!pendingSpeciesDocument) {
            betterSend(parsedMessage.channel, `No pending species submission with the common name "${fullSearchTerm}" could be found.`);
            return;
        }

        // Create a new pending species object from the found document
        const pendingSpeciesObject = new PendingSpecies(pendingSpeciesDocument);

        // Create a new approval message from the object and send it
        const approvalMessage = new SpeciesApprovalMessage(parsedMessage.channel, pendingSpeciesObject);

        try {
            await approvalMessage.send();
        }
        catch (error) {
            throw new Error(`There was an error attempting to send a species approval message: ${error}`);
        }

        // When the message's time limit is reached
        approvalMessage.once("timeExpired", () => {
            betterSend(parsedMessage.channel, "Time limit expired.");
        });

        // When the user presses the exit button
        approvalMessage.once("exit", () => {
            betterSend(parsedMessage.channel, "Approval process aborted.");
        });

        // When the user presses the deny button
        approvalMessage.once("deny", () => {
            betterSend(parsedMessage.channel, "Submission denied.");
        });

        // If the submission gets approved (submitted)
        approvalMessage.once("submit", (finalDocument: SimpleEDoc) => {
            // Create a new species from the final document
            const speciesDocument = new SpeciesModel(finalDocument);

            // Get common names and their lowercase array form
            const commonNames = finalDocument[PendingSpecies.fieldNames.commonNames] as unknown as CommonNameTemplate[];
            const commonNamesLower = commonNamesToLower(commonNames);
            
            // Assign lowercase common names
            speciesDocument.set(PendingSpecies.fieldNames.commonNamesLower, commonNamesLower);

            // Save the new species
            speciesDocument.save().then(() => {
                betterSend(parsedMessage.channel, "Species approved.");

                encounterHandler.loadRarityTable().catch(error => {
                    throw new Error(`There was an error reloading the species rarity table after adding a new species: ${error}`);
                });

                // Delete the pending species
                pendingSpeciesObject.delete().catch(error => {
                    throw new Error(`There was an error attempting to delete a newly approved pending species from the database: ${error}`);
                });
            }).catch(error => {
                throw new Error(`There was an error attempting to save a newly approved species to the database: ${error}`);
            });
        });
    }
}