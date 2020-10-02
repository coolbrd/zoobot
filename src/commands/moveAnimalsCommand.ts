import { stripIndents } from "common-tags";
import { Types } from "mongoose";
import getGuildMember from "../discordUtility/getGuildMember";
import { betterSend } from "../discordUtility/messageMan";
import CommandParser from "../structures/commandParser";
import { getPlayerObject } from "../zoo/userManagement";
import Command from "../structures/commandInterface";

export default class MoveAnimalsCommand implements Command {
    public readonly commandNames = ['moveanimals', 'ma'];

    public help(prefix: string): string {
        return stripIndents`
            Use \`${prefix}moveanimals\` \`<starting position>\` \`<animal number>\` \`<animal number>\` \`...\` to move animals in your inventory to a given position.
            Example: \`${prefix}moveanimals 12 45 6 2 18\` will move the animals in your inventory that are at positions 45, 6, 2, and 18 (in that order) to the position directly after animal 12 in your inventory.
        `;
    }

    public async run(parsedUserCommand: CommandParser): Promise<void> {
        // If the message was sent in a dm chat, don't let things continue (naughty user!)
        if (parsedUserCommand.channel.type === 'dm') {
            betterSend(parsedUserCommand.channel, 'This command can only be used in servers.');
            return
        }

        // If the command was used without any arguments
        if (parsedUserCommand.args.length < 1) {
            betterSend(parsedUserCommand.channel, this.help(parsedUserCommand.displayPrefix));
            return;
        }

        // Get the player game object
        const playerObject = await getPlayerObject(getGuildMember(parsedUserCommand.originalMessage.author, parsedUserCommand.channel.guild));

        const positions: number[] = [];
        const errors: string[] = [];
        // Iterate over every argument provided by the user
        parsedUserCommand.args.forEach(arg => {
            // Parse the argument as a number and offset it for use as an index
            const numericPosition = Number(arg) - 1;
            // If the current argument couldn't be converted int a number
            if (isNaN(numericPosition)) {
                errors.push(`Not a number: \`${arg}\``);
            }
            // If the current number is below the acceptable range
            else if (numericPosition < 0) {
                errors.push(`Too low: \`${arg}\``);
            }
            // If the current number is above the acceptable range
            else if (numericPosition >= playerObject.getAnimalIds().length) {
                errors.push(`Out of range: \`${arg}\``);
            }
            // If the current number is a repeat
            else if (positions.includes(numericPosition)) {
                errors.push(`Duplicate: \`${arg}\``);
            }
            // If the current number passes all tests
            else {
                // Add it to the list of positions
                positions.push(numericPosition);
            }
        });

        // If there are any errors at all
        if (errors.length > 0) {
            betterSend(parsedUserCommand.channel, `All animal position arguments must be in number form, and be within the numeric bounds of your inventory. Errors: ${errors.join(', ')}`);
            // Don't run the command with errors
            return;
        }

        // If enough positions weren't provided
        if (positions.length < 2) {
            betterSend(parsedUserCommand.channel, `You need to specify at least one position of an animal to place after position \`${positions[0]}\`.`);
            return;
        }

        // Get the first position from the array and remove it
        const sortPosition = positions.shift() as number;
        // Get the id of the animal that's acting as the anchor in the movement
        const baseAnimalId = playerObject.getAnimalIds()[sortPosition];

        // What happens if the move fails
        const onFail = () => {
            betterSend(parsedUserCommand.channel, 'There was an error moving your animals. If there are animals missing from your inventory, please contact support. (Don\'t worry, they\'re not gone)');
        }

        // Try to remove all animal ids at the given positions from the user's inventory
        let animalIds: Types.ObjectId[];
        try {
            animalIds = await playerObject.removeAnimalsPositional(positions);
        }
        catch (error) {
            onFail();
            console.error('There was an error trying to bulk remove animals from a player\'s inventory for movement.');
            throw new Error(error);
        }

        // After the animals have been removed, get the new position of the base animal to sort under
        const basePosition = playerObject.getAnimalIds().indexOf(baseAnimalId);

        // Attempt to add the previously removed animal ids directly under the position of the animal at the base position
        try {
            await playerObject.addAnimalsPositional(animalIds, basePosition + 1);
        }
        catch (error) {
            onFail();
            console.error('There was an error trying to add animals back to a player\'s inventory for movement.');
            throw new Error(error);
        }

        parsedUserCommand.originalMessage.react('✅');
    }
}