import { CommandSection, GuildCommand } from "../structures/Command/Command";
import { GuildCommandParser } from "../structures/Command/CommandParser";
import { betterSend } from "../discordUtility/messageMan";
import { remainingTimeString } from "../utility/timeStuff";
import { stripIndent } from "common-tags";
import CommandReceipt from "../structures/Command/CommandReceipt";
import gameConfig from "../config/gameConfig";
import BeastiaryClient from "../bot/BeastiaryClient";

class EncounterCommand extends GuildCommand {
    public readonly commandNames = ["encounter", "e"];

    public readonly info = "Initiate an animal encounter";

    public readonly helpUseString = "to initiate an animal encounter.";

    public readonly section = CommandSection.gettingStarted;

    public readonly blocksInput = true;

    public async run(parsedMessage: GuildCommandParser, commandReceipt: CommandReceipt, beastiaryClient: BeastiaryClient): Promise<CommandReceipt> {
        const player = await beastiaryClient.beastiary.players.safeFetch(parsedMessage.member);

        if (!player.hasEncounters) {
            betterSend(parsedMessage.channel, `You don't have any encounters left.\n\nNext encounter reset: **${remainingTimeString(beastiaryClient.beastiary.resets.nextEncounterReset)}**.`);
            return commandReceipt;
        }

        player.encounterAnimal();

        player.awardCrewExperienceInChannel(gameConfig.xpPerEncounter, parsedMessage.channel);

        try {
            await beastiaryClient.beastiary.encounters.spawnAnimal(parsedMessage.channel);
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