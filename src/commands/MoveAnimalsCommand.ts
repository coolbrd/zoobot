import { stripIndent } from "common-tags";
import { betterSend } from "../discordUtility/messageMan";
import { GuildCommandParser } from "../structures/Command/CommandParser";
import { CommandArgumentInfo, CommandSection, GuildCommand } from "../structures/Command/Command";
import { Player } from "../structures/GameObject/GameObjects/Player";
import CommandReceipt from "../structures/Command/CommandReceipt";
import BeastiaryClient from "../bot/BeastiaryClient";
import { inspect } from "util";

class MoveAnimalsCommand extends GuildCommand {
    public readonly names = ["moveanimals", "ma"];

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

    public readonly sections = [CommandSection.animalManagement];

    public readonly blocksInput = true;

    public async run(parsedMessage: GuildCommandParser, beastiaryClient: BeastiaryClient): Promise<CommandReceipt> {
        const commandReceipt = this.newReceipt();
        
        if (!parsedMessage.currentArgument) {
            betterSend(parsedMessage.channel, this.help(parsedMessage.displayPrefix, parsedMessage.commandChain));
            return commandReceipt;
        }

        let playerObject: Player;
        try {
            playerObject = await beastiaryClient.beastiary.players.fetch(parsedMessage.member);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error getting a player object in the move animals command.

                Guild member: ${inspect(parsedMessage.member)}
                
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
            else if (numericPosition >= playerObject.collectionAnimalIds.list.length) {
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

        const baseAnimalId = playerObject.collectionAnimalIds.list[sortPosition];

        const movedAnimalIds = playerObject.collectionAnimalIds.removePositional(positions);

        const basePosition = playerObject.collectionAnimalIds.list.indexOf(baseAnimalId);

        playerObject.collectionAnimalIds.insert(basePosition + 1, ...movedAnimalIds);

        commandReceipt.reactConfirm = true;
        return commandReceipt;
    }
}
export default new MoveAnimalsCommand();