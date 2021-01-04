import BeastiaryClient from "../../bot/BeastiaryClient";
import gameConfig from "../../config/gameConfig";
import { betterSend } from "../../discordUtility/messageMan";
import { GuildCommand } from "../../structures/Command/Command";
import { GuildCommandParser } from "../../structures/Command/CommandParser";
import CommandReceipt from "../../structures/Command/CommandReceipt";

class CrewAddSubCommand extends GuildCommand {
    public readonly names = ["add", "a"];

    public readonly info = "Add an animal to your crew";

    public readonly helpUseString = "`<animal nickname or number>` to add an animal to your crew, allowing them to passively earn xp.";

    public readonly blocksInput = true;

    public async run(parsedMessage: GuildCommandParser, beastiaryClient: BeastiaryClient): Promise<CommandReceipt> {
        const commandReceipt = this.newReceipt();
        
        if (!parsedMessage.restOfText) {
            betterSend(parsedMessage.channel, this.help(parsedMessage.displayPrefix, parsedMessage.commandChain));
            return commandReceipt;
        }

        const player = await beastiaryClient.beastiary.players.safeFetch(parsedMessage.member);

        const animalIdentifier = parsedMessage.restOfText;

        const animal = beastiaryClient.beastiary.animals.searchPlayerAnimal(animalIdentifier, player);

        if (!animal) {
            betterSend(parsedMessage.channel, "No animal with that nickname/number exists in your collection.");
            return commandReceipt;
        }

        if (player.crewAnimalIds.list.includes(animal.id)) {
            betterSend(parsedMessage.channel, "That animal is already in your crew.");
            return commandReceipt;
        }

        if (player.crewFull) {
            let crewFullString = "Your crew is full, remove an animal and try again.";

            if (!player.getPremium()) {
                crewFullString += `\n\nPremium players get double the crew space. Check out <${gameConfig.patreonLink}> to learn more!`;
            }

            betterSend(parsedMessage.channel, crewFullString);
            return commandReceipt;
        }

        player.crewAnimalIds.push(animal.id);

        commandReceipt.reactConfirm = true;
        return commandReceipt;
    }
}
export default new CrewAddSubCommand();