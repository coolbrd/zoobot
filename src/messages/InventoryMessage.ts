import { TextChannel, MessageEmbed, User } from "discord.js";

import { Animal } from "../models/Animal";
import { capitalizeFirstLetter } from "../utility/arraysAndSuch";
import getGuildMember from "../discordUtility/getGuildMember";
import { Player } from "../models/Player";
import SmartEmbed from "../discordUtility/SmartEmbed";
import buildAnimalInfo from "../embedBuilders/buildAnimalInfo";
import buildAnimalCard from "../embedBuilders/buildAnimalCard";
import { errorHandler } from "../structures/ErrorHandler";
import PagedMessage from "./PagedMessage";
import { commandHandler } from "../structures/CommandHandler";
import { beastiary } from "../beastiary/Beastiary";
import { betterSend } from "../discordUtility/messageMan";
import { Types } from "mongoose";

// The set of states that an inventory message can be in
enum InventoryMessageState {
    page,
    info,
    card,
    release
}

interface LoadableAnimal {
    id: Types.ObjectId,
    animal?: Animal
}

export default class InventoryMessage extends PagedMessage<LoadableAnimal> {
    // The current display state of the message
    private state: InventoryMessageState;
    
    private readonly user: User;
    public readonly channel: TextChannel;

    private playerObject: Player | undefined;

    constructor(channel: TextChannel, user: User) {
        super(channel);

        this.addButtons([{
            name: "upArrow",
            emoji: "⬆️",
            helpMessage: "Pointer up"
        },
        {
            name: "downArrow",
            emoji: "⬇️",
            helpMessage: "Pointer down"
        },
        {
            name: "mode",
            emoji: "Ⓜ️",
            helpMessage: "View mode"
        },
        {
            name: "release",
            emoji: "🗑️",
            helpMessage: "Release"
        }]);

        this.user = user;
        this.channel = channel;

        // Start the inventory message in paged view mode
        this.state = InventoryMessageState.page;
    }

    // Pre-send build logic
    public async build(): Promise<void> {
        super.build();

        // Attempt to get the user's player object
        let playerObject: Player;
        try {
            playerObject = await beastiary.players.fetch(getGuildMember(this.user, this.channel.guild));
        }
        catch (error) {
            throw new Error(`There was an error fetching a player in an inventory message: ${error}`);
        }

        // Assign the new player object
        this.playerObject = playerObject;

        // The list of animals that will need to be loaded by their ids
        const loadableAnimals: LoadableAnimal[] = [];

        // Add the all the player's animal ids to the list of loadable animals
        for (const animalId of playerObject.animalIds) {
            loadableAnimals.push({
                id: animalId
            });
        }

        // Set paged elements
        this.setElements(loadableAnimals);

        // Build the initial embed
        try {
            this.setEmbed(await this.buildEmbed());
        }
        catch (error) {
            throw new Error(`There was an error building the initial embed of an inventory message: ${error}`);
        }
    }

    // Builds the current page of the inventory's embed
    // Is async because fetches for each animal are made as-needed
    private async buildEmbed(): Promise<MessageEmbed> {
        const embed = new SmartEmbed();

        // Make it more clear what we're working with here
        const inventory = this.elements;

        const userAvatar = this.user.avatarURL() || undefined;
        embed.setAuthor(`${this.user.username}'s collection`, userAvatar);
        embed.setFooter(`${inventory.length} in collection\n${this.getButtonHelpString()}`);

        // Don't try anything crazy if the user's inventory is empty
        if (inventory.length < 1) {
            embed.setDescription(`It's empty in here. Try catching an animal with \`${commandHandler.getGuildPrefix(this.channel.guild)}encounter\`!`);
            return embed;
        }
        
        // Bulk load all animals on the current page
        try {
            await new Promise(resolve => {
                let count = 0;
                // Iterate over every loadable animal on the page
                this.visibleElements.forEach(loadableAnimal => {
                    // Get each animal's object by their id
                    beastiary.animals.fetchById(loadableAnimal.id).then(animal => {
                        // Assign the loaded animal
                        loadableAnimal.animal = animal;

                        // Resolve once all animals on the page are loaded
                        if (++count >= this.visibleElements.length) {
                            resolve();
                        }
                    }).catch(error => {
                        throw new Error(`There was an error fetching an animal in an inventory message: ${error}`);
                    });
                });
            });
        }
        catch (error) {
            throw new Error(`There was an error bulk fetching an inventory page of animals: ${error}`);
        }

        // Get the animal that's selected by the pointer
        const selectedAnimal = inventory.selection().animal as Animal;
        const card = selectedAnimal.card;

        // Display state behavior
        switch (this.state) {
            // When the message is in paged view mode
            case InventoryMessageState.page: {
                // Show the selected animal's card in the thumbnail
                embed.setThumbnail(card.url);

                // The string that will hold the formatted inventory string
                let inventoryString = "";
                let inventoryIndex = this.firstVisibleIndex;
                // Iterate over every animal on the current page
                this.visibleElements.forEach(loadableAnimal => {
                    // Get the animal object (and assume it's an animal because we fetched it)
                    const currentAnimal = loadableAnimal.animal as Animal;

                    const card = currentAnimal.card;

                    const animalName = currentAnimal.nickname || capitalizeFirstLetter(currentAnimal.name);

                    // Write breed information only if it's present (and the animal doesn't have a nickname)
                    const breedText = !currentAnimal.nickname && card.breed ? `(${card.breed})` : "";

                    // The pointer text to draw on the current animal entry (if any)
                    const pointerText = inventoryIndex === inventory.getPointerPosition() ? " 🔹" : "";

                    inventoryString += `\`${inventoryIndex + 1})\` ${animalName} ${breedText}`;

                    inventoryString += ` ${pointerText}\n`;

                    inventoryIndex++;
                });

                embed.setDescription(inventoryString);

                break;
            }
            // When the message is in info mode
            case InventoryMessageState.info: {
                buildAnimalInfo(embed, selectedAnimal);

                embed.setTitle(`\`${inventory.getPointerPosition() + 1})\` ${embed.title}`);
                
                break;
            }
            // When the message is in card mode
            case InventoryMessageState.card: {
                buildAnimalCard(embed, selectedAnimal);

                embed.setTitle(`\`${inventory.getPointerPosition() + 1})\` ${embed.title}`);

                break;
            }
            // When the message is confirming the release of an animal
            case InventoryMessageState.release: {
                embed.setTitle(`Release ${selectedAnimal.name}?`);

                embed.setDescription(`Press the left arrow (${this.getButtonByName("leftArrow").emoji}) to confirm this release. Press any other button or do nothing to cancel.`);

                embed.setThumbnail(card.url);

                break;
            }
        }

        // Update button messages according to behavior
        switch (this.state) {
            case InventoryMessageState.release: {
                this.setButtonHelpMessage("leftArrow", "Confirm release");
                break;
            }
            default: {
                this.setButtonHelpMessage("leftArrow", "Page left");
                break;
            }
        }

        return embed;
    }

    public async buttonPress(buttonName: string, user: User): Promise<void> {
        super.buttonPress(buttonName, user);

        const inventory = this.elements;

        // If the message in any state other than releasing an animal
        if (this.state !== InventoryMessageState.release) {
            // Button behavior
            switch (buttonName) {
                case "upArrow": {
                    this.movePointer(-1);
                    break;
                }
                case "downArrow": {
                    this.movePointer(1);
                    break;
                }
                case "leftArrow": {
                    // Change pages if the message is in page mode, otherwise move the pointer
                    if (this.state === InventoryMessageState.page) {
                        this.movePages(-1);
                    }
                    else {
                        this.movePointer(-1);
                    }
                    break;
                }
                case "rightArrow": {
                    // Change pages if the message is in page mode, otherwise move the pointer
                    if (this.state === InventoryMessageState.page) {
                        this.movePages(1);
                    }
                    else {
                        this.movePointer(1);
                    }
                    break;
                }
                case "mode": {
                    if (this.state === InventoryMessageState.page) {
                        this.state = InventoryMessageState.info;
                    }
                    else if (this.state === InventoryMessageState.info) {
                        this.state = InventoryMessageState.card;
                    }
                    else {
                        this.state = InventoryMessageState.page;
                    }
                    break;
                }
                case "release": {
                    // Initiate relese mode
                    this.state = InventoryMessageState.release;
                }
            }
        }
        // If the message is currently confirming the release of an animal
        else {
            // If the confirmation button is pressed
            if (buttonName === "leftArrow") {
                // Get the selected animal that will be released
                const selectedAnimal = inventory.selection();

                // Release the user's animal
                try {
                    await beastiary.animals.deleteAnimal(selectedAnimal.id);
                }
                catch (error) {
                    errorHandler.handleError(error, "There was an error trying to delete an animal in an inventory message.");

                    betterSend(this.channel, "A problem was encountered while trying to release this animal. Please report this to the developer.");

                    return;
                }

                // Delete the animal from the inventory message
                inventory.deleteAtPointer();

                // Put the message back in paged mode
                this.state = InventoryMessageState.page;
            }
            // If any button other than the confirmation button is pressed
            else {
                // Return the message to paged mode
                this.state = InventoryMessageState.page;
            }
        }

        try {
            this.setEmbed(await this.buildEmbed());
        }
        catch (error) {
            throw new Error(`There was an error building the embed of an inventory message: ${error}`);
        }
    }
}