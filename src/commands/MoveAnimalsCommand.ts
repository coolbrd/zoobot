import { stripIndents } from "common-tags";
import getGuildMember from "../discordUtility/getGuildMember";
import { betterSend } from "../discordUtility/messageMan";
import { GuildCommandParser } from "../structures/CommandParser";
import { CommandSection, GuildCommand } from "../structures/Command";
import { Player } from "../models/Player";
import { beastiary } from "../beastiary/Beastiary";

export default class MoveAnimalsCommand extends GuildCommand {
    public readonly commandNames = ["moveanimals", "ma"];

    public readonly info = "Rearrange animals in your collection";

    public readonly section = CommandSection.animalManagement;

    public readonly blocksInput = true;

    public readonly reactConfirm = true;

    public help(prefix: string): string {
        return stripIndents`
            Use \`${prefix}${this.commandNames[0]}\` \`<starting position>\` \`<animal number>\` \`<animal number>\` \`...\` to move animals in your collection to a given position.
            Example: \`${prefix}moveanimals 12 45 6 2 18\` will move the animals in your collection that are at positions 45, 6, 2, and 18 (in that order) to the position directly after animal 12 in your collection.
        `;
    }

    public async run(parsedUserCommand: GuildCommandParser): Promise<boolean> {
        if (parsedUserCommand.arguments.length < 1) {
            betterSend(parsedUserCommand.channel, this.help(parsedUserCommand.displayPrefix));
            return false;
        }

        let playerObject: Player;
        try {
            playerObject = await beastiary.players.fetch(getGuildMember(parsedUserCommand.sender, parsedUserCommand.guild));
        }
        catch (error) {
            throw new Error(`There was an error getting a player object in the move animals command: ${error}`);
        }

        const positions: number[] = [];
        // Any errors encountered while parsing positions, if any
        const errors: string[] = [];

        parsedUserCommand.arguments.forEach(arg => {
            const argText = arg.text;

            const numericPosition = Number(argText) - 1;
            if (isNaN(numericPosition)) {
                errors.push(`Not a number: \`${argText}\``);
            }
            else if (numericPosition < 0) {
                errors.push(`Too low: \`${argText}\``);
            }
            else if (numericPosition >= playerObject.collectionAnimalIds.length) {
                errors.push(`Out of range: \`${argText}\``);
            }
            else if (positions.includes(numericPosition)) {
                errors.push(`Duplicate: \`${argText}\``);
            }
            else {
                positions.push(numericPosition);
            }
        });

        if (errors.length > 0) {
            betterSend(parsedUserCommand.channel, `All animal position arguments must be in number form, and be within the numeric bounds of your collection. Errors: ${errors.join(", ")}`);
            return false;
        }

        if (positions.length < 2) {
            betterSend(parsedUserCommand.channel, `You need to specify at least one position of an animal to place after position \`${positions[0]}\`.`);
            return false;
        }

        const sortPosition = positions.shift() as number;

        const baseAnimalId = playerObject.collectionAnimalIds[sortPosition];

        const movedAnimalIds = playerObject.removeAnimalIdsFromCollectionPositional(positions);

        const basePosition = playerObject.collectionAnimalIds.indexOf(baseAnimalId);

        playerObject.addAnimalIdsToCollectionPositional(movedAnimalIds, basePosition + 1);

        return true;
    }
}