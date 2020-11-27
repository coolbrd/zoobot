import { stripIndent } from "common-tags";
import BeastiaryClient from "../bot/BeastiaryClient";
import gameConfig from "../config/gameConfig";
import { betterSend } from "../discordUtility/messageMan";
import { CommandArgumentInfo, CommandSection, GuildCommand } from "../structures/Command/Command";
import { GuildCommandParser } from "../structures/Command/CommandParser";
import CommandReceipt from "../structures/Command/CommandReceipt";
import { Animal } from "../structures/GameObject/GameObjects/Animal";
import { Player } from "../structures/GameObject/GameObjects/Player";
import { remainingTimeString } from "../utility/timeStuff";

class GiveXpCommand extends GuildCommand {
    public readonly commandNames = ["givexp", "gx"];

    public readonly info = "Give an xp boost to one of your animals"

    public readonly helpUseString = "to give one of your animals some xp.";

    public readonly section = CommandSection.animalManagement;

    public readonly blocksInput = true;

    public readonly arguments: CommandArgumentInfo[] = [
        {
            name: "animal name or number"
        }
    ];

    public async run(parsedMessage: GuildCommandParser, commandReceipt: CommandReceipt, beastiaryClient: BeastiaryClient): Promise<CommandReceipt> {
        if (parsedMessage.arguments.length < 1) {
            betterSend(parsedMessage.channel, this.help(parsedMessage.displayPrefix, parsedMessage.commandChain));
            return commandReceipt;
        }

        const animalIdentifier = parsedMessage.arguments[0].text.toLowerCase();

        let player: Player;
        try {
            player = await beastiaryClient.beastiary.players.fetch(parsedMessage.member);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error fetching a player by a guild member.

                Guild member: ${JSON.stringify(parsedMessage.member)}
            `);
        }

        if (player.xpBoostsLeft <= 0) {
            betterSend(parsedMessage.channel, `You don't have any xp boosts left. Next xp boost reset: **${remainingTimeString(beastiaryClient.beastiary.resets.nextXpBoostReset)}**`);
            return commandReceipt;
        }

        let animal: Animal | undefined;
        try {
            animal = await beastiaryClient.beastiary.animals.searchAnimal(animalIdentifier, {
                playerObject: player,
                searchList: "collection"
            });
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error fetching an animal by a search term in the give xp command.

                Search term: ${animalIdentifier}
                Player: ${player.debugString}
            `);
        }
        
        if (!animal) {
            betterSend(parsedMessage.channel, "No animal with that name/identifier could be found in your collection.");
            return commandReceipt;
        }

        animal.addExperienceInChannel(gameConfig.xpPerBoost, parsedMessage.channel);

        player.useXpBoost();

        const xpEmoji = beastiaryClient.beastiary.emojis.getByName("xp");
        betterSend(parsedMessage.channel, `Success, you gave ${animal.displayName} **+${gameConfig.xpPerBoost}**${xpEmoji}`);

        return commandReceipt;
    }
}
export default new GiveXpCommand();