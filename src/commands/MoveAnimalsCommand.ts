import { stripIndents } from "common-tags";
import { betterSend } from "../discordUtility/messageMan";
import { GuildCommandParser } from "../structures/Command/CommandParser";
import { CommandArgumentInfo, CommandSection, GuildCommand } from "../structures/Command/Command";
import { Player } from "../structures/GameObject/GameObjects/Player";
import { beastiary } from "../beastiary/Beastiary";
import CommandReceipt from "../structures/Command/CommandReceipt";

class MoveAnimalsCommand extends GuildCommand {
    public readonly commandNames = ["moveanimals", "ma"];

    public readonly info = "Rearrange animals in your collection";

    public readonly helpUseString = "`<starting position>` `<animal number>` `<animal number>` `...` to move animals in your collection to a given position.";

    public readonly arguments: CommandArgumentInfo[] = [
        {
            name: "anchor position",
            info: "the position of the animal to place all following animal numbers underneath"
        },
        {
            name: "animal number",
            info: "an animal number to place directly beneath the previous number",
            continuous: true
        }
    ];

    public readonly section = CommandSection.animalManagement;

    public readonly blocksInput = true;

    public async run(parsedMessage: GuildCommandParser, commandReceipt: CommandReceipt): Promise<CommandReceipt> {
        if (parsedMessage.arguments.length < 1) {
            betterSend(parsedMessage.channel, this.help(parsedMessage.displayPrefix, parsedMessage.commandChain));
            return commandReceipt;
        }

        let playerObject: Player;
        try {
            playerObject = await beastiary.players.fetch(parsedMessage.member);
        }
        catch (error) {
            throw new Error(stripIndents`
                There was an error getting a player object in the move animals command.

                Guild member: ${JSON.stringify(parsedMessage.member)}
                
                ${error}
            `);
        }

        const positions: number[] = [];
        // Any errors encountered while parsing positions, if any
        const errors: string[] = [];

        parsedMessage.arguments.forEach(arg => {
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
            betterSend(parsedMessage.channel, `All animal position arguments must be in number form, and be within the numeric bounds of your collection. Errors: ${errors.join(", ")}`);
            return commandReceipt;
        }

        if (positions.length < 2) {
            betterSend(parsedMessage.channel, `You need to specify at least one position of an animal to place after position \`${positions[0]}\`.`);
            return commandReceipt;
        }

        const sortPosition = positions.shift() as number;

        const baseAnimalId = playerObject.collectionAnimalIds[sortPosition];

        const movedAnimalIds = playerObject.removeAnimalIdsFromCollectionPositional(positions);

        const basePosition = playerObject.collectionAnimalIds.indexOf(baseAnimalId);

        playerObject.addAnimalIdsToCollectionPositional(movedAnimalIds, basePosition + 1);

        commandReceipt.reactConfirm = true;
        return commandReceipt;
    }
}
export default new MoveAnimalsCommand();