import { TextChannel, MessageEmbed, User, GuildMember } from "discord.js";

import InteractiveMessage from "../interactiveMessage/interactiveMessage";
import { AnimalObject } from "../models/animal";
import { capitalizeFirstLetter } from "../utility/arraysAndSuch";
import { getGuildMember } from "../discordUtility/getGuildMember";
import { betterSend } from "../discordUtility/messageMan";
import { loopValue } from "../utility/loopValue";
import InteractiveMessageHandler from "../interactiveMessage/interactiveMessageHandler";
import { getGuildUserDocument, releaseAnimal } from "../zoo/userManagement";
import { GuildUserObject } from "../models/guildUser";
import { PointedArray } from "../structures/pointedArray";
import { SmartEmbed } from "../discordUtility/smartEmbed";

enum InventoryMessageState {
    page,
    info,
    image
}

export class InventoryMessage extends InteractiveMessage {
    private readonly user: User;
    protected readonly channel: TextChannel;

    private inventory = new PointedArray<AnimalObject>();

    private page = 0;
    private animalsPerPage = 10;
    private pageCount = 0;

    private state: InventoryMessageState;

    private guildMember: GuildMember;

    public constructor(handler: InteractiveMessageHandler, channel: TextChannel, user: User) {
        super(handler, channel, { buttons: [
            {
                name: 'leftArrow',
                emoji: '⬅️'
            },
            {
                name: 'rightArrow',
                emoji: '➡️'
            },
            {
                name: 'upArrow',
                emoji: '⬆️'
            },
            {
                name: 'downArrow',
                emoji: '⬇️'
            },
            {
                name: 'info',
                emoji: 'ℹ️'
            },
            {
                name: 'image',
                emoji: '🖼️'
            },
            {
                name: 'release',
                emoji: '🗑️'
            }
        ]});

        this.user = user;
        this.channel = channel;

        this.state = InventoryMessageState.page;

        this.guildMember = getGuildMember(user, channel.guild);
    }

    // Pre-send build logic
    public async build(): Promise<void> {
        super.build();

        let guildUserObject: GuildUserObject;
        try {
            // Get the user's guild user document and convert it into an object
            guildUserObject = new GuildUserObject(await getGuildUserDocument(this.guildMember));
        }
        catch (error) {
            console.error('There was an error trying to create a GuildUserObject in an inventory message.');
            throw new Error(error);
        }

        // Assign the user's animal inentory to this message's inventory
        this.inventory = new PointedArray(guildUserObject.animals);

        // Calculate and set page count
        this.pageCount = Math.ceil(this.inventory.length / this.animalsPerPage);

        try {
            this.setEmbed(await this.buildEmbed());
        }
        catch (error) {
            throw new Error(error);
        }
    }

    // Build's the current page of the inventory's embed
    // Is async because queries for each animal's species data are being made as requested, rather than initially
    private async buildEmbed(): Promise<MessageEmbed> {
        const embed = new SmartEmbed();

        const userAvatar = this.user.avatarURL() || undefined;
        embed.setAuthor(`${this.user.username}'s collection`, userAvatar);

        embed.setFooter(`${this.inventory.length} in collection`);

        // Don't try anything crazy if the user's inventory is empty
        if (this.inventory.length < 1) {
            return embed;
        }

        // Calculate the start and end points of the current page
        const startIndex = this.page * this.animalsPerPage;
        const endIndex = startIndex + this.animalsPerPage;

        // The array that will hold the asynchronous functions to execute in bulk
        const unloadedAnimals: AnimalObject[] = this.inventory.slice(startIndex, endIndex).filter(animal => {
            // Only fill the array with animals that haven't been loaded yet
            return !animal.populated();
        });
        
        try {
            // Load the unloaded animals if there are any
            unloadedAnimals.length && await AnimalObject.bulkPopulate(unloadedAnimals);
        }
        catch (error) {
            console.error('There was an error trying to bulk populate a list of animal objects in an inventory message.');
            throw new Error(error);
        }

        // Get the animal that's selected by the pointer
        const selectedAnimal = this.inventory.selection();
        // Get the animal's necessary information
        const species = selectedAnimal.getSpecies();
        const image = selectedAnimal.getImage();

        const imageIndex = species.images.findIndex(speciesImage => {
            return speciesImage._id.equals(image._id);
        });
        
        // Display state behavior
        switch (this.state) {
            case InventoryMessageState.page: {
                embed.setThumbnail(this.inventory[0].getImage().url);

                let inventoryString = '';
                // Start the current page's display at the appropriate position
                let inventoryIndex = startIndex;
                // Loop until either the index is above the entries per page limit or the length of the inventory
                while (inventoryIndex < endIndex && inventoryIndex < this.inventory.length) {
                    // Get the currently iterated animal in the user's inventory
                    const animal = this.inventory[inventoryIndex];

                    const species = animal.getSpecies();
                    const image = animal.getImage();

                    const firstName = species.commonNames[0];

                    const breed = image.breed;
                    // Write breed information only if it's present
                    const breedText = breed ? `(${breed})` : '';

                    // The pointer text to draw on the current animal entry (if any)
                    const pointerText = inventoryIndex === this.inventory.getPointerPosition() ? ' 🔹' : '';

                    inventoryString += `\`${inventoryIndex + 1})\` ${capitalizeFirstLetter(firstName)} ${breedText}${pointerText}\n`;
                    inventoryIndex++;
                }

                embed.setDescription(inventoryString);

                break;
            }
            case InventoryMessageState.info: {
                embed.setThumbnail(image.url);

                embed.setTitle(`\`${this.inventory.getPointerPosition() + 1})\` ${capitalizeFirstLetter(species.commonNames[0])}`);
                
                embed.addField('Species', capitalizeFirstLetter(species.scientificName), true);

                embed.addField('Card', `${imageIndex + 1}/${species.images.length}`, true);

                image.breed && embed.addField('Breed', capitalizeFirstLetter(image.breed));

                break;
            }
            case InventoryMessageState.image: {
                embed.setImage(image.url);
                embed.addField(`\`${this.inventory.getPointerPosition() + 1})\` ${capitalizeFirstLetter(species.commonNames[0])}`, `Card #${imageIndex + 1} of ${species.images.length}`);

                break;
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
            case 'info': {
                if (this.state !== InventoryMessageState.info) {
                    this.state = InventoryMessageState.info;
                }
                else {
                    this.state = InventoryMessageState.page;
                }
                break;
            }
            case 'image': {
                if (this.state !== InventoryMessageState.image) {
                    this.state = InventoryMessageState.image;
                }
                else {
                    this.state = InventoryMessageState.page;
                }
                break;
            }
            case 'release': {
                // Get the selected animal that will be released
                const selectedAnimal = this.inventory.selection();

                // Release the user's animal
                try {
                    await releaseAnimal(this.guildMember, selectedAnimal._id);
                }
                catch (error) {
                    betterSend(this.channel, 'There was an error releasing this animal.');
                    console.error('There was an error trying to release a user\'s animal from an inventory message.');
                    throw new Error(error);
                }

                // Delete the animal from the inventory message
                this.inventory.deleteAtPointer();
            }
        }

        try {
            this.setEmbed(await this.buildEmbed());
        }
        catch (error) {
            throw new Error(error);
        }
    }
}