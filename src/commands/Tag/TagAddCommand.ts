import BeastiaryClient from "../../bot/BeastiaryClient";
import { betterSend } from "../../discordUtility/messageMan";
import { CommandArgumentInfo, GuildCommand } from "../../structures/Command/Command";
import { GuildCommandParser } from "../../structures/Command/CommandParser";
import CommandReceipt from "../../structures/Command/CommandReceipt";

class TagAddCommand extends GuildCommand {
    public readonly names = ["add"];

    public readonly info = "Add a tag to an animal";

    public readonly helpUseString = "`<animal identifier>` `<tag>` to add a tag to an animal.";

    public readonly arguments: CommandArgumentInfo[] = [
        {
            name: "animal identifier",
            info: "the common name, nickname, or number of the animal to tag",
            optional: false,
        },
        {
            name: "tag",
            info: "the tag to mark the animal with",
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

        if (tag.length > 64) {
            betterSend(parsedMessage.channel, "Try to keep tags short, please! (less than 64 characters)");
            return receipt;
        }

        if (animal.tags.list.includes(tag)) {
            betterSend(parsedMessage.channel, `${animal.displayNameSimple} already has the tag "${tag}". Use the \`tag\` \`remove\` command to remove it if that's what you're trying to do.`);
            return receipt;
        }

        animal.tags.push(tag);

        receipt.reactConfirm = true;
        return receipt;
    }
}
export default new TagAddCommand();