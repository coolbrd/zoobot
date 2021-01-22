import BeastiaryClient from "../../bot/BeastiaryClient";
import { betterSend } from "../../discordUtility/messageMan";
import { CommandArgumentInfo, GuildCommand } from "../../structures/Command/Command";
import { GuildCommandParser } from "../../structures/Command/CommandParser";
import CommandReceipt from "../../structures/Command/CommandReceipt";

class TagRemoveCommand extends GuildCommand {
    public readonly names = ["remove"];

    public readonly info = "Remove a tag from an animal";

    public readonly helpUseString = "`<animal identifier>` `<tag>` to remove a tag from an animal.";

    public readonly arguments: CommandArgumentInfo[] = [
        {
            name: "animal identifier",
            info: "the common name, nickname, or number of the animal to remove a tag from",
            optional: false,
        },
        {
            name: "tag",
            info: "the tag to remove from the animal",
            optional: false
        }
    ];

    public async run(parsedMessage: GuildCommandParser, beastiaryClient: BeastiaryClient): Promise<CommandReceipt> {
        const receipt = this.newReceipt();

        if (!parsedMessage.currentArgument) {
            betterSend(parsedMessage.channel, this.help(parsedMessage.displayPrefix, parsedMessage.commandChain));
            return receipt;
        }

        const animalIdentifier = parsedMessage.consumeArgument().text.toLowerCase();

        if (!parsedMessage.currentArgument) {
            betterSend(parsedMessage.channel, this.help(parsedMessage.displayPrefix, parsedMessage.commandChain));
            return receipt;
        }

        const player = await beastiaryClient.beastiary.players.safeFetch(parsedMessage.member);

        const animal = beastiaryClient.beastiary.animals.searchPlayerAnimal(animalIdentifier, player);

        if (!animal) {
            betterSend(parsedMessage.channel, `No animal with the name/number "${animalIdentifier}" could be found in your collection.`);
            return receipt;
        }

        const tag = parsedMessage.restOfText.toLowerCase();

        if (!animal.tags.list.includes(tag)) {
            betterSend(parsedMessage.channel, `${animal.displayNameSimple} doesn't have the tag "${tag}", so it can't be removed.`);
            return receipt;
        }

        animal.tags.remove(tag);

        receipt.reactConfirm = true;
        return receipt;
    }
}
export default new TagRemoveCommand();