import { betterSend } from "../discordUtility/messageMan";
import { CommandArgumentInfo, CommandSection, GuildCommand } from "../structures/Command/Command";
import { GuildCommandParser } from "../structures/Command/CommandParser";
import CommandReceipt from "../structures/Command/CommandReceipt";
import BeastiaryClient from "../bot/BeastiaryClient";

class ChangeAnimalNicknameCommand extends GuildCommand {
    public readonly names = ["nickname", "nick", "nn"];

    public readonly info = "Change the nickname of one of your captured animals";

    public readonly helpUseString = "`<animal number or nickname>` `<new nickname>` to change the nickname of an animal in your collection. Use quotation marks (\") for any animal names/identifiers with spaces in them.";

    public readonly arguments: CommandArgumentInfo[] = [
        {
            name: "animal identifier",
            info: "the nickname or number of the animal in your collection"
        },
        {
            name: "nickname",
            info: "the animal's new nickname",
            optional: true,
            default: "the animal's common name, if left out"
        }
    ];

    public readonly sections = [CommandSection.animalManagement];

    public async run(parsedMessage: GuildCommandParser, beastiaryClient: BeastiaryClient): Promise<CommandReceipt> {
        const commandReceipt = this.newReceipt();

        if (!parsedMessage.currentArgument) {
            betterSend(parsedMessage.channel, this.help(parsedMessage.displayPrefix, parsedMessage.commandChain));
            return commandReceipt;
        }

        const player = await beastiaryClient.beastiary.players.safeFetch(parsedMessage.member);

        const animalIdentifier = parsedMessage.consumeArgument().text;

        const animal = beastiaryClient.beastiary.animals.searchPlayerAnimal(animalIdentifier, player);

        if (!animal) {
            betterSend(parsedMessage.channel, `No animal by the name/number '${animalIdentifier}' exists in your collection. Make sure to put multi-word animal names in quotes!`);
            return commandReceipt;
        }

        let newNickname: string | undefined;
        if (!parsedMessage.currentArgument) {
            betterSend(parsedMessage.channel, "Success, nickname reset.");
            // Set the animal's nickname as nothing, resetting it
            newNickname = undefined;
        }
        // If the user specified a nickname
        else {
            newNickname = parsedMessage.restOfText;

            if (newNickname.length >= 256) {
                betterSend(parsedMessage.channel, "Nicknames must be less than 256 characters in length. Calm down, maybe?");
                return commandReceipt;
            }

            const bannedSubStrings = ["*", "_", "`", "~", ">"];

            for (const substring of bannedSubStrings) {
                if (newNickname.includes(substring)) {
                    betterSend(parsedMessage.channel, `Animal nicknames can't contain any Discord-reserved formatting characters, such as: '${substring}'`);
                    return commandReceipt;
                }
            }
        }

        animal.nickname = newNickname;

        commandReceipt.reactConfirm = true;
        return commandReceipt;
    }
}
export default new ChangeAnimalNicknameCommand();