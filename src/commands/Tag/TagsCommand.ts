import BeastiaryClient from "../../bot/BeastiaryClient";
import { betterSend } from "../../discordUtility/messageMan";
import SmartEmbed from "../../discordUtility/SmartEmbed";
import { CommandArgumentInfo, CommandSection, GuildCommand } from "../../structures/Command/Command";
import { GuildCommandParser } from "../../structures/Command/CommandParser";
import CommandReceipt from "../../structures/Command/CommandReceipt";
import TagAddCommand from "./TagAddCommand";
import TagRemoveCommand from "./TagRemoveCommand";

class TagsCommand extends GuildCommand {
    public readonly names = ["tag", "tags"];

    public readonly info = "Manage your animals' tags";

    public readonly helpUseString = "`<animal identifier>` to view the tags of that animal.";

    public readonly arguments: CommandArgumentInfo[] = [
        {
            name: "animal identifier",
            optional: false,
            info: "the common name, nickname, or number of the animal to view the tags of"
        }
    ];

    public readonly sections = [CommandSection.animalManagement];

    public readonly subCommands = [TagAddCommand, TagRemoveCommand];

    public async run(parsedMessage: GuildCommandParser, beastiaryClient: BeastiaryClient): Promise<CommandReceipt> {
        const receipt = this.newReceipt();

        if (!parsedMessage.currentArgument) {
            betterSend(parsedMessage.channel, this.help(parsedMessage.displayPrefix, parsedMessage.commandChain));
            return receipt;
        }

        const player = await beastiaryClient.beastiary.players.safeFetch(parsedMessage.member);

        const animalIdentifier = parsedMessage.consumeArgument().text.toLowerCase();

        const animal = await beastiaryClient.beastiary.animals.searchPlayerAnimal(animalIdentifier, player);

        if (!animal) {
            betterSend(parsedMessage.channel, `No animal with the name/number "${animalIdentifier}" could be found in your collection.`);
            return receipt;
        }

        const embed = new SmartEmbed();
        embed.setAuthor({ name: `${animal.displayNameSimple}'s tags`, iconURL: animal.card.url });
        embed.setColor(0x798be5);
        if (animal.tags.list.length > 0) {
            embed.setDescription(animal.tags.list.join(", "));
        }
        else {
            embed.setDescription("This animal doesn't have any tags yet. Assign some with the `tag` `add` command.");
        }
        embed.setFooter({  text: "Use the 'tag add' or 'tag remove' commands to add or remove tags, respectively" })
        betterSend(parsedMessage.channel, embed);

        return receipt;
    }
}
export default new TagsCommand();