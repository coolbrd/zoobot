import { TextChannel, MessageEmbed, User, GuildMember } from "discord.js";

import InteractiveMessage from "../interactiveMessage/interactiveMessage";
import { AnimalObject } from "../models/animal";
import { capitalizeFirstLetter } from "../utility/arraysAndSuch";
import getGuildMember from "../discordUtility/getGuildMember";
import loopValue from "../utility/loopValue";
import InteractiveMessageHandler from "../interactiveMessage/interactiveMessageHandler";
import { PlayerObject } from "../models/player";
import PointedArray from "../structures/pointedArray";
import SmartEmbed from "../discordUtility/smartEmbed";
import { deleteAnimal, getPlayerObject } from "../zoo/userManagement";
import { commandHandler } from "..";
import buildAnimalInfo from "../embedBuilders/buildAnimalInfo";
import buildAnimalImage from "../embedBuilders/buildAnimalImage";
import { errorHandler } from "../structures/errorHandler";

// The set of states that an inventory message can be in
enum InventoryMessageState {
    page,
    info,
    image,
    release
}

export default class InventoryMessage extends InteractiveMessage {
    private readonly user: User;
    protected readonly channel: TextChannel;

    // The inventory of AnimalObjects to display
    private inventory = new PointedArray<AnimalObject>();

    // The page to start on
    private page = 0;
    private animalsPerPage = 10;
    // The number of total pages in the inventory
    // This has to be initialized as 0 because the page count can't be determined until the message is built
    private pageCount = 0;

    // The current display state of the message
    private state: InventoryMessageState;

    private readonly guildMember: GuildMember;
    private playerObject: PlayerObject | undefined;

    constructor(handler: InteractiveMessageHandler, channel: TextChannel, user: User) {
        super(handler, channel, { buttons: [
            {
                name: 'leftArrow',
                emoji: '⬅️',
                helpMessage: 'page left'
            },
            {
                name: 'rightArrow',
                emoji: '➡️',
                helpMessage: 'page right'
            },
            {
                name: 'upArrow',
                emoji: '⬆️',
                helpMessage: 'pointer up'
            },
            {
                name: 'downArrow',
                emoji: '⬇️',
                helpMessage: 'pointer down'
            },
            {
                name: 'mode',
                emoji: 'Ⓜ️',
                helpMessage: 'view mode'
            },
            {
                name: 'release',
                emoji: '🗑️',
                helpMessage: 'release'
            }
        ]});

        this.user = user;
        this.channel = channel;

        // Start the inventory message in paged view mode
        this.state = InventoryMessageState.page;

        // Find the Discord guild member corresponding to this message's requester
        this.guildMember = getGuildMember(user, channel.guild);
    }

    // Pre-send build logic
    public async build(): Promise<void> {
        super.build();

        // Attempt to get the user's player object
        let playerObject: PlayerObject;
        try {
            playerObject = await getPlayerObject(this.guildMember);
            await playerObject.load();
        }
        catch (error) {
            errorHandler.handleError(error, 'There was an error trying to get a player object in an inventory message.');
            return;
        }

        // Assign the new player object
        this.playerObject = playerObject;
        this.inventory = new PointedArray(this.playerObject.getAnimals());

        // Calculate and set page count
        this.pageCount = Math.ceil(this.inventory.length / this.animalsPerPage);

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

        if (this.state === InventoryMessageState.release) {
            this.setButtonHelpMessage('leftArrow', 'confirm release');
        }
        else {
            this.setButtonHelpMessage('leftArrow', 'page left');
        }

        const userAvatar = this.user.avatarURL() || undefined;
        embed.setAuthor(`${this.user.username}'s collection`, userAvatar);
        embed.setFooter(`${this.inventory.length} in collection\n${this.getButtonHelpString()}`);

        // Don't try anything crazy if the user's inventory is empty
        if (this.inventory.length < 1) {
            embed.setDescription(`It's empty in here. Try catching an animal with \`${commandHandler.getGuildPrefix(this.channel.guild)}encounter\`!`);
            return embed;
        }

        // Calculate the start and end points of the current page
        const startIndex = this.page * this.animalsPerPage;
        const endIndex = startIndex + this.animalsPerPage;

        // Filter the currently displayed slice of the inventory array for animals that haven't been loaded yet
        const unloadedAnimals: AnimalObject[] = this.inventory.slice(startIndex, endIndex).filter((animalObject: AnimalObject) => {
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
        const selectedAnimal = this.inventory.selection();
        const image = selectedAnimal.getImage();

        // Display state behavior
        switch (this.state) {
            // When the message is in paged view mode
            case InventoryMessageState.page: {
                embed.setThumbnail(image.getUrl());

                let inventoryString = '';
                // Start the current page's display at the appropriate position
                let inventoryIndex = startIndex;
                // Loop until either the index is above the entries per page limit or the length of the inventory
                while (inventoryIndex < endIndex && inventoryIndex < this.inventory.length) {
                    // Get the currently iterated animal in the user's inventory
                    const currentAnimal: AnimalObject = this.inventory[inventoryIndex];

                    const image = currentAnimal.getImage();

                    const animalName = currentAnimal.getNickname() || capitalizeFirstLetter(currentAnimal.getName());

                    const breed = image.getBreed();
                    // Write breed information only if it's present (and the animal doesn't have a nickname)
                    const breedText = !currentAnimal.getNickname() && breed ? `(${breed})` : '';

                    // The pointer text to draw on the current animal entry (if any)
                    const pointerText = inventoryIndex === this.inventory.getPointerPosition() ? ' 🔹' : '';

                    inventoryString += `\`${inventoryIndex + 1})\` ${animalName} ${breedText}`;

                    inventoryString += ` ${pointerText}\n`;

                    inventoryIndex++;
                }

                embed.setDescription(inventoryString);

                break;
            }
            // When the message is in info mode
            case InventoryMessageState.info: {
                buildAnimalInfo(embed, selectedAnimal);

                embed.setTitle(`\`${this.inventory.getPointerPosition() + 1})\` ${embed.title}`);
                
                break;
            }
            // When the message is in image mode
            case InventoryMessageState.image: {
                buildAnimalImage(embed, selectedAnimal);

                embed.setTitle(`\`${this.inventory.getPointerPosition() + 1})\` ${embed.title}`);

                break;
            }
            // When the message is confirming the release of an animal
            case InventoryMessageState.release: {
                embed.setTitle(`Release ${selectedAnimal.getName()}?`);

                embed.setDescription(`Press the left arrow (${this.getButtonByName('leftArrow').emoji}) to confirm this release. Press any other button or do nothing to cancel.`);

                embed.setThumbnail(image.getUrl());
            }
        }

        return embed;
    }

    // Move a number of pages
    private movePages(count: number): void {
        // Moves the desired number of pages, looping if necessary
        this.page = loopValue(this.page + count, 0, this.pageCount - 1);
        // If the page move caused the pointer to be off the page
        if (!this.pointerIsOnPage()) {
            // Move the pointer to the first entry on the page
            this.inventory.setPointerPosition(this.page * this.animalsPerPage);
        }
    }

    // Gets the page that the pointer is currently on
    private getPointerPage(): number {
        return Math.floor(this.inventory.getPointerPosition() / this.animalsPerPage);
    }

    // Checks if the pointer is on the message's currently displayed page
    private pointerIsOnPage(): boolean {
        return this.page === this.getPointerPage();
    }

    // Moves to the page that the pointer is on
    private goToPointerPage(): void {
        this.page = this.getPointerPage();
    }

    // Moves the pointer a number of positions
    private movePointer(count: number): void {
        // Move the pointer to the new position
        this.inventory.movePointer(count);
        // If moving the pointer made it leave the page
        if (!this.pointerIsOnPage()) {
            // Change the page to the one that the pointer's on
            this.goToPointerPage();
        }
    }

    public async buttonPress(buttonName: string, user: User): Promise<void> {
        super.buttonPress(buttonName, user);

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
                const selectedAnimal = this.inventory.selection();

                // Release the user's animal
                try {
                    await deleteAnimal({animalObject: selectedAnimal});
                }
                catch (error) {
                    errorHandler.handleError(error, 'There was an error trying to release a user\'s animal from an inventory message.');
                    return;
                }

                // Delete the animal from the inventory message
                this.inventory.deleteAtPointer();

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