import { TextChannel, MessageEmbed, User } from "discord.js";

import { AnimalObject } from "../models/animal";
import { capitalizeFirstLetter } from "../utility/arraysAndSuch";
import getGuildMember from "../discordUtility/getGuildMember";
import { PlayerObject } from "../models/player";
import SmartEmbed from "../discordUtility/smartEmbed";
import { deleteAnimal, getPlayerObject } from "../zoo/userManagement";
import buildAnimalInfo from "../embedBuilders/buildAnimalInfo";
import buildAnimalImage from "../embedBuilders/buildAnimalImage";
import { errorHandler } from "../structures/errorHandler";
import PagedMessage from "./pagedMessage";
import { commandHandler } from "../structures/commandHandler";

// The set of states that an inventory message can be in
enum InventoryMessageState {
    page,
    info,
    image,
    release
}

export default class InventoryMessage extends PagedMessage<AnimalObject> {
    // The current display state of the message
    private state: InventoryMessageState;
    
    private readonly user: User;
    protected readonly channel: TextChannel;

    private playerObject: PlayerObject | undefined;

    constructor(channel: TextChannel, user: User) {
        super(channel);

        this.addButtons([{
            name: 'upArrow',
            emoji: '⬆️',
            helpMessage: 'Pointer up'
        },
        {
            name: 'downArrow',
            emoji: '⬇️',
            helpMessage: 'Pointer down'
        },
        {
            name: 'mode',
            emoji: 'Ⓜ️',
            helpMessage: 'View mode'
        },
        {
            name: 'release',
            emoji: '🗑️',
            helpMessage: 'Release'
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
        let playerObject: PlayerObject;
        try {
            playerObject = await getPlayerObject(getGuildMember(this.user, this.channel.guild));
            await playerObject.load();
        }
        catch (error) {
            errorHandler.handleError(error, 'There was an error trying to get and load a player object in an inventory message.');
            return;
        }

        // Assign the new player object
        this.playerObject = playerObject;
        // Assign the elements that will be displayed in this message
        this.setElements(this.playerObject.getAnimals());

        // Build the initial embed
        try {
            this.setEmbed(await this.buildEmbed());
        }
        catch (error) {
            errorHandler.handleError(error, 'There was an error building the embed of an inventory message.');
            return;
        }
    }

    // Build's the current page of the inventory's embed
    // Is async because queries for each animal's species data are being made as requested, rather than initially
    private async buildEmbed(): Promise<MessageEmbed> {
        const embed = new SmartEmbed();

        const inventory = this.getElements();

        const userAvatar = this.user.avatarURL() || undefined;
        embed.setAuthor(`${this.user.username}'s collection`, userAvatar);
        embed.setFooter(`${inventory.length} in collection\n${this.getButtonHelpString()}`);

        // Don't try anything crazy if the user's inventory is empty
        if (inventory.length < 1) {
            embed.setDescription(`It's empty in here. Try catching an animal with \`${commandHandler.getGuildPrefix(this.channel.guild)}encounter\`!`);
            return embed;
        }

        // Filter the currently displayed slice of the inventory array for animals that haven't been loaded yet
        const unloadedAnimals = this.getVisibleElements().filter((animalObject: AnimalObject) => {
            return !animalObject.fullyLoaded();
        });
        
        // If there are animals that need to be loaded, initiate a promise to load them all at once
        unloadedAnimals.length && await new Promise(resolve => {
            let count = 0;
            unloadedAnimals.forEach(unloadedAnimal => {
                // Load every animal in the necessary array
                unloadedAnimal.load().then(() => {
                    // When the last animal is loaded, resolve the promise and continue on
                    if (++count >= unloadedAnimals.length) {
                        resolve();
                    }
                }).catch(error => {
                    errorHandler.handleError(error, 'There was an error loading an unloaded animal in an inventory message.');
                    return;
                });
            });
        });

        // Get the animal that's selected by the pointer
        const selectedAnimal = inventory.selection();
        const image = selectedAnimal.getImage();

        // Display state behavior
        switch (this.state) {
            // When the message is in paged view mode
            case InventoryMessageState.page: {
                // Show the selected animal's image in the thumbnail
                embed.setThumbnail(image.getUrl());

                // The string that will hold the formatted inventory string
                let inventoryString = '';
                let inventoryIndex = this.getFirstVisibleIndex();
                // Iterate over every element on the current page
                this.getVisibleElements().forEach(currentAnimal => {
                    const image = currentAnimal.getImage();

                    const animalName = currentAnimal.getNickname() || capitalizeFirstLetter(currentAnimal.getName());

                    const breed = image.getBreed();
                    // Write breed information only if it's present (and the animal doesn't have a nickname)
                    const breedText = !currentAnimal.getNickname() && breed ? `(${breed})` : '';

                    // The pointer text to draw on the current animal entry (if any)
                    const pointerText = inventoryIndex === inventory.getPointerPosition() ? ' 🔹' : '';

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
            // When the message is in image mode
            case InventoryMessageState.image: {
                buildAnimalImage(embed, selectedAnimal);

                embed.setTitle(`\`${inventory.getPointerPosition() + 1})\` ${embed.title}`);

                break;
            }
            // When the message is confirming the release of an animal
            case InventoryMessageState.release: {
                embed.setTitle(`Release ${selectedAnimal.getName()}?`);

                embed.setDescription(`Press the left arrow (${this.getButtonByName('leftArrow').emoji}) to confirm this release. Press any other button or do nothing to cancel.`);

                embed.setThumbnail(image.getUrl());

                break;
            }
        }

        // Update button messages according to behavior
        switch (this.state) {
            case InventoryMessageState.release: {
                this.setButtonHelpMessage('leftArrow', 'Confirm release');
                break;
            }
            default: {
                this.setButtonHelpMessage('leftArrow', 'Page left');
                break;
            }
        }

        return embed;
    }

    public async buttonPress(buttonName: string, user: User): Promise<void> {
        super.buttonPress(buttonName, user);

        const inventory = this.getElements();

        // If the message in any state other than releasing an animal
        if (this.state !== InventoryMessageState.release) {
            // Button behavior
            switch (buttonName) {
                case 'upArrow': {
                    this.movePointer(-1);
                    break;
                }
                case 'downArrow': {
                    this.movePointer(1);
                    break;
                }
                case 'leftArrow': {
                    // Change pages if the message is in page mode, otherwise move the pointer
                    if (this.state === InventoryMessageState.page) {
                        this.movePages(-1);
                    }
                    else {
                        this.movePointer(-1);
                    }
                    break;
                }
                case 'rightArrow': {
                    // Change pages if the message is in page mode, otherwise move the pointer
                    if (this.state === InventoryMessageState.page) {
                        this.movePages(1);
                    }
                    else {
                        this.movePointer(1);
                    }
                    break;
                }
                case 'mode': {
                    if (this.state === InventoryMessageState.page) {
                        this.state = InventoryMessageState.info;
                    }
                    else if (this.state === InventoryMessageState.info) {
                        this.state = InventoryMessageState.image;
                    }
                    else {
                        this.state = InventoryMessageState.page;
                    }
                    break;
                }
                case 'release': {
                    // Initiate relese mode
                    this.state = InventoryMessageState.release;
                }
            }
        }
        // If the message is currently confirming the release of an animal
        else {
            // If the confirmation button is pressed
            if (buttonName === 'leftArrow') {
                // Get the selected animal that will be released
                const selectedAnimal = inventory.selection();

                // Release the user's animal
                try {
                    await deleteAnimal({animalObject: selectedAnimal});
                }
                catch (error) {
                    errorHandler.handleError(error, 'There was an error trying to release a user\'s animal from an inventory message.');
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
            errorHandler.handleError(error, 'There was an error building the embed of an inventory message.');
            return;
        }
    }
}