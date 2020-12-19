import { stripIndent } from "common-tags";
import BeastiaryClient from "../bot/BeastiaryClient";
import gameConfig from "../config/gameConfig";
import { betterSend } from "../discordUtility/messageMan";
import { CommandArgumentInfo, CommandSection, GuildCommand } from "../structures/Command/Command";
import { GuildCommandParser } from "../structures/Command/CommandParser";
import CommandReceipt from "../structures/Command/CommandReceipt";
import { Animal } from "../structures/GameObject/GameObjects/Animal";
import { remainingTimeString } from "../utility/timeStuff";

class GiveXpCommand extends GuildCommand {
    public readonly names = ["givexp", "gx"];

    public readonly info = "Give an xp boost to one of your animals"

    public readonly helpUseString = "to give one of your animals some xp.";

    public readonly section = CommandSection.animalManagement;

    public readonly blocksInput = true;

    public readonly arguments: CommandArgumentInfo[] = [
        {
            name: "animal name or number"
        }
    ];

    public async run(parsedMessage: GuildCommandParser, beastiaryClient: BeastiaryClient): Promise<CommandReceipt> {
        const commandReceipt = this.newReceipt();
        
        if (!parsedMessage.currentArgument) {
            betterSend(parsedMessage.channel, this.help(parsedMessage.displayPrefix, parsedMessage.commandChain));
            return commandReceipt;
        }

        const animalIdentifier = parsedMessage.restOfText.toLowerCase();

        const player = await beastiaryClient.beastiary.players.safeFetch(parsedMessage.member);

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

        player.useXpBoost();

        const xpReceipt = animal.addExperienceInChannel(gameConfig.xpPerBoost, parsedMessage.channel);

        const xpEmoji = beastiaryClient.beastiary.emojis.getByName("xp");

        let resultString: string;
        if (xpReceipt.taken === xpReceipt.given) {
            resultString = `Success, you gave ${animal.displayName} +**${xpReceipt.given}**${xpEmoji}`;
        }
        else {
            resultString = stripIndent`
                You gave ${animal.displayName} **${xpReceipt.given}**${xpEmoji}, but only **${xpReceipt.taken}**${xpEmoji} was gained.
                Earn more ${animal.species.commonNames[0]} essence to raise ${animal.displayName}'s level cap!
            `;
        }
        betterSend(parsedMessage.channel, resultString);

        return commandReceipt;
    }
}
export default new GiveXpCommand();