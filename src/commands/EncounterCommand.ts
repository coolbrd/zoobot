import { CommandSection, GuildCommand } from "../structures/Command/Command";
import { GuildCommandParser } from "../structures/Command/CommandParser";
import { betterSend } from "../discordUtility/messageMan";
import { encounterHandler } from "../beastiary/EncounterHandler";
import { beastiary } from "../beastiary/Beastiary";
import { Player } from "../structures/GameObject/GameObjects/Player";
import { remainingTimeString } from "../utility/timeStuff";
import { stripIndent } from "common-tags";
import CommandReceipt from "../structures/Command/CommandReceipt";

class EncounterCommand extends GuildCommand {
    public readonly commandNames = ["encounter", "e"];

    public readonly info = "Initiate an animal encounter";

    public readonly helpUseString = "to initiate an animal encounter.";

    public readonly section = CommandSection.gettingStarted;

    public readonly blocksInput = true;

    public async run(parsedMessage: GuildCommandParser, commandReceipt: CommandReceipt): Promise<CommandReceipt> {
        let player: Player;
        try {
            player = await beastiary.players.fetch(parsedMessage.member);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error fetching a player for use in the encounter command.

                Guild member: ${JSON.stringify(parsedMessage.member)}
                
                ${error}
            `);
        }

        if (!player.hasEncounters) {
            betterSend(parsedMessage.channel, `You don't have any encounters left.\n\nNext encounter reset: **${remainingTimeString(encounterHandler.nextEncounterReset)}**.`);
            return commandReceipt;
        }

        player.encounterAnimal();

        try {
            await encounterHandler.spawnAnimal(parsedMessage.channel);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error creating a new animal encounter.

                Message: ${JSON.stringify(parsedMessage)}
                
                ${error}
            `);
        }

        return commandReceipt;
    }
}
export default new EncounterCommand();