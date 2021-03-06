import { stripIndent } from "common-tags";
import Emojis from "../beastiary/Emojis";
import BeastiaryClient from "../bot/BeastiaryClient";
import gameConfig from "../config/gameConfig";
import { betterSend } from "../discordUtility/messageMan";
import { CommandArgumentInfo, CommandSection, GuildCommand } from "../structures/Command/Command";
import { GuildCommandParser } from "../structures/Command/CommandParser";
import CommandReceipt from "../structures/Command/CommandReceipt";
import { remainingTimeString } from "../utility/timeStuff";

class GiveXpCommand extends GuildCommand {
    public readonly names = ["givexp", "gx"];

    public readonly info = "Give an xp boost to one of your animals"

    public readonly helpUseString = "to give one of your animals some xp.";

    public readonly sections = [CommandSection.gameplay, CommandSection.animalManagement];

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
            let noXpBoostsLeftString = `You don't have any xp boosts left. Next xp boost reset: **${remainingTimeString(player.freeXpBoosts.nextReset)}**`;

            if (!player.premium) {
                noXpBoostsLeftString += `\n\nWant more? Subscribe at <${gameConfig.patreonLink}> for exclusive premium features such as more encounters, captures, and xp!`;
            }

            betterSend(parsedMessage.channel, noXpBoostsLeftString);

            return commandReceipt;
        }

        const animal = await beastiaryClient.beastiary.animals.searchPlayerAnimal(animalIdentifier, player);
        
        if (!animal) {
            betterSend(parsedMessage.channel, "No animal with that name/identifier could be found in your collection.");
            return commandReceipt;
        }

        const xpReceipt = animal.addExperienceInChannel(gameConfig.xpPerBoost, parsedMessage.channel);

        player.useXpBoost();

        let resultString: string;
        if (xpReceipt.xpTaken === xpReceipt.xpGiven) {
            resultString = `Success, you gave ${animal.displayName} +**${xpReceipt.xpGiven}**${Emojis.xp}`;
        }
        else {
            resultString = stripIndent`
                You gave ${animal.displayName} **${xpReceipt.xpGiven}**${Emojis.xp}, but only **${xpReceipt.xpTaken}**${Emojis.xp} was gained.
                Earn more ${animal.species.commonNames[0]} essence${Emojis.essence} to raise ${animal.displayName}'s level cap!
            `;
        }
        betterSend(parsedMessage.channel, resultString);

        return commandReceipt;
    }
}
export default new GiveXpCommand();