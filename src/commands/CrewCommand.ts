import { stripIndents } from "common-tags";
import { beastiary } from "../beastiary/Beastiary";
import handleUserError from "../discordUtility/handleUserError";
import CrewMessage from "../messages/CrewMessage";
import { Player } from "../structures/GameObject/GameObjects/Player";
import { CommandSection, GuildCommand } from "../structures/Command/Command";
import { GuildCommandParser } from "../structures/Command/CommandParser";
import { betterSend } from "../discordUtility/messageMan";
import { Animal } from "../structures/GameObject/GameObjects/Animal";

export default class CrewCommand extends GuildCommand {
    public readonly commandNames = ["crew"];

    public readonly info = "View your current crew of selected animals";

    public readonly section = CommandSection.animalManagement;

    public readonly reactConfirm = true;

    public help(displayPrefix: string): string {
        return stripIndents`
            Use \`${displayPrefix}${this.commandNames[0]}\` to view the animals currently earning xp in your crew.

            You can also do \`${displayPrefix}${this.commandNames[0]}\` \`<user id or tag>\` to view another user's crew in this server.

            Use \`${displayPrefix}${this.commandNames[0]} add/remove\` \`<animal identifier>\` to add or remove animals from your crew.
        `;
    }

    public async run(parsedMessage: GuildCommandParser): Promise<boolean> {
        let player: Player;

        if (parsedMessage.arguments.length === 0) {
            try {
                player = await beastiary.players.fetchByGuildCommandParser(parsedMessage);
            }
            catch (error) {
                handleUserError(parsedMessage.channel, error);
                return false;
            }

            const crewMessage = new CrewMessage(parsedMessage.channel, player);

            try {
                await crewMessage.send();
            }
            catch (error) {
                throw new Error(stripIndents`
                    There was an error sending a crew message.

                    Crew message: ${JSON.stringify(crewMessage)}
                    
                    ${error}
                `);
            }

            return false;
        }
        else {
            try {
                player = await beastiary.players.fetch(parsedMessage.member);
            }
            catch (error) {
                throw new Error(stripIndents`
                    There was an error fetching a player in the crew command.

                    Guild member: ${JSON.stringify(parsedMessage.member)}
                `);
            }

            const crewArgument = parsedMessage.arguments[0].text.toLowerCase();

            if (parsedMessage.arguments.length < 2) {
                try {
                    player = await beastiary.players.fetchByGuildCommandParser(parsedMessage);
                }
                catch (error) {
                    handleUserError(parsedMessage.channel, error);
                    return false;
                }

                const crewMessage = new CrewMessage(parsedMessage.channel, player);

                try {
                    await crewMessage.send();
                }
                catch (error) {
                    throw new Error(stripIndents`
                        There was an error sending a crew message.

                        Crew message: ${JSON.stringify(crewMessage)}
                        
                        ${error}
                    `);
                }

                return false;
            }
    
            const animalIdentifier = parsedMessage.arguments[1].text.toLowerCase();

            if (crewArgument === "add") {
                let animal: Animal | undefined;
                try {
                    animal = await beastiary.animals.searchAnimal(animalIdentifier, {
                        playerObject: player,
                        searchList: "collection"
                    });
                }
                catch (error) {
                    throw new Error(stripIndents`
                        There was an error searching for an animal when attempting to add an animal to a player's crew.
        
                        Search term: ${animalIdentifier}
                        Parsed message: ${JSON.stringify(parsedMessage)}
                        
                        ${error}
                    `);
                }
        
                if (!animal) {
                    betterSend(parsedMessage.channel, "No animal with that nickname/number exists in your collection.");
                    return false;
                }
        
                if (player.crewAnimalIds.includes(animal.id)) {
                    betterSend(parsedMessage.channel, "That animal is already in your crew.");
                    return false;
                }
        
                if (player.crewAnimalIds.length >= 2) {
                    betterSend(parsedMessage.channel, "Your crew is full, remove an animal and try again.");
                    return false;
                }
        
                player.addAnimalIdToCrew(animal.id);
        
                return true;
            }
            else if (crewArgument === "remove") {
                let animal: Animal | undefined;
                try {
                    animal = await beastiary.animals.searchAnimal(animalIdentifier, {
                        playerObject: player,
                        searchList: "crew"
                    });
                }
                catch (error) {
                    throw new Error(stripIndents`
                        There was an error searching for an animal in a player's crew.

                        Player: ${JSON.stringify(player)}
                        Parsed message: ${JSON.stringify(parsedMessage)}
                        
                        ${error}
                    `);
                }

                if (!animal) {
                    betterSend(parsedMessage.channel, "No animal with that nickname or number exists in your crew.");
                    return false;
                }

                const targetAnimalId = animal.id;

                const animalInCrew = player.crewAnimalIds.some(animalId => {
                    return animalId.equals(targetAnimalId);
                });

                if (!animalInCrew) {
                    betterSend(parsedMessage.channel, `"${animal.displayName}" isn't in your crew, so it couldn't be removed.`);
                    return false;
                }

                player.removeAnimalIdFromCrew(animal.id);

                return true;
            }
            else {
                betterSend(parsedMessage.channel, this.help(parsedMessage.displayPrefix));
                return false;
            }
        }
    }
}