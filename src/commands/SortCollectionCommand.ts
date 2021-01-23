import { stripIndent } from "common-tags";
import BeastiaryClient from "../bot/BeastiaryClient";
import { betterSend } from "../discordUtility/messageMan";
import { CommandArgumentInfo, CommandSection, GuildCommand } from "../structures/Command/Command";
import { GuildCommandParser } from "../structures/Command/CommandParser";
import CommandReceipt from "../structures/Command/CommandReceipt";
import { Animal } from "../structures/GameObject/GameObjects/Animal";

class SortCollectionCommand extends GuildCommand {
    public readonly names = ["sortcollection", "sc"];

    public readonly info = "Sort the animals in your collection";

    public readonly helpUseString = "`<sort option>` to automatically sort the animals in your collection by a certain criterion.";

    public readonly sections = [CommandSection.animalManagement];

    public readonly arguments: CommandArgumentInfo[] = [
        {
            name: "sort option",
            info: "the factor to sort your animals by.",
            optional: false,
            options: ["level", "rarity"]
        }
    ];

    public async run(parsedMessage: GuildCommandParser, beastiaryClient: BeastiaryClient): Promise<CommandReceipt> {
        const receipt = this.newReceipt();

        if (!parsedMessage.currentArgument) {
            betterSend(parsedMessage.channel, this.help(parsedMessage.displayPrefix, parsedMessage.commandChain));
            return receipt;
        }

        const sortOption = parsedMessage.consumeArgument().text.toLowerCase();

        let sortCriterion: (animal: Animal) => number;
        if (sortOption === "level") {
            sortCriterion = animal => animal.experience;
        }
        else if (sortOption === "rarity") {
            sortCriterion = animal => animal.species.rarityTier;
        }
        else {
            betterSend(parsedMessage.channel, `'${sortOption}' is not a valid option to sort your animals by. Try either \`level\` or \`rarity\`.`);
            return receipt;
        }

        const player = await beastiaryClient.beastiary.players.safeFetch(parsedMessage.member);

        player.collectionAnimalIds.list.sort((id1, id2) => {
            const animal1 = player.animals.find(animal => animal.id.equals(id1));
            const animal2 = player.animals.find(animal => animal.id.equals(id2));

            if (!animal1 || !animal2) {
                throw new Error(stripIndent`
                    One or more invalid animal ids was found in a player's collection while sorting it.

                    Id1: ${id1}
                    Id2: ${id2}

                    Player: ${player.debugString}
                `);
            }

            const number1 = sortCriterion(animal1);
            const number2 = sortCriterion(animal2);

            return number2 - number1;
        });

        receipt.reactConfirm = true;
        return receipt;
    }
}
export default new SortCollectionCommand();