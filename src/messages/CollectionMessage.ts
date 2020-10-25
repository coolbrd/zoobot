import { TextChannel, MessageEmbed, User } from "discord.js";
import { Animal } from "../models/Animal";
import { capitalizeFirstLetter } from "../utility/arraysAndSuch";
import { Player } from "../models/Player";
import SmartEmbed from "../discordUtility/SmartEmbed";
import buildAnimalInfo from "../embedBuilders/buildAnimalInfo";
import buildAnimalCard from "../embedBuilders/buildAnimalCard";
import PagedMessage from "./PagedMessage";
import { commandHandler } from "../structures/CommandHandler";
import { beastiary } from "../beastiary/Beastiary";
import { Types } from "mongoose";

// The set of states that a collection message can be in
enum CollectionMessageState {
    page,
    info,
    card
}

// An animal id with its optionally loaded animal object
interface LoadableAnimal {
    id: Types.ObjectId,
    animal?: Animal
}

// The message displaying a player's animal collection
export default class CollectionMessage extends PagedMessage<LoadableAnimal> {
    // The current display state of the message
    private state: CollectionMessageState;
    
    private readonly player: Player;
    public readonly channel: TextChannel;

    constructor(channel: TextChannel, player: Player) {
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
        }]);

        this.player = player;
        this.channel = channel;

        // Start the collection message in paged view mode
        this.state = CollectionMessageState.page;
    }

    // Pre-send build logic
    public async build(): Promise<void> {
        super.build();

        // The list of animals that will need to be loaded by their ids
        const loadableAnimals: LoadableAnimal[] = [];

        // Add the all the player's animal ids to the list of loadable animals
        for (const animalId of this.player.animalIds) {
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
            throw new Error(`There was an error building the initial embed of a collection message: ${error}`);
        }
    }

    // Builds the current page of the collection's embed
    // Is async because fetches for each animal are made as-needed
    private async buildEmbed(): Promise<MessageEmbed> {
        const embed = new SmartEmbed();

        // Make it more clear what we're working with here
        const collection = this.elements;

        const userAvatar = this.player.member.user.avatarURL() || undefined;
        embed.setAuthor(`${this.player.member.user.username}'s collection`, userAvatar);
        embed.setFooter(`${collection.length} in collection\n${this.getButtonHelpString()}`);

        // Don't try anything crazy if the user's collection is empty
        if (collection.length < 1) {
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
                        throw new Error(`There was an error fetching an animal in an collection message: ${error}`);
                    });
                });
            });
        }
        catch (error) {
            throw new Error(`There was an error bulk fetching an collection page of animals: ${error}`);
        }

        // Get the animal that's selected by the pointer
        const selectedAnimal = collection.selection.animal as Animal;
        const card = selectedAnimal.card;

        // Display state behavior
        switch (this.state) {
            // When the message is in paged view mode
            case CollectionMessageState.page: {
                // Show the selected animal's card in the thumbnail
                embed.setThumbnail(card.url);

                // The string that will hold the formatted collection string
                let collectionString = "";
                let collectionIndex = this.firstVisibleIndex;
                // Iterate over every animal on the current page
                this.visibleElements.forEach(loadableAnimal => {
                    // Get the animal object (and assume it's an animal because we fetched it)
                    const currentAnimal = loadableAnimal.animal as Animal;

                    const card = currentAnimal.card;

                    const animalName = currentAnimal.nickname || capitalizeFirstLetter(currentAnimal.name);

                    // Add special or breed text if applicable
                    let specialText = "";
                    if (!currentAnimal.nickname) {
                        if (card.special) {
                            specialText = card.special;
                        }
                        else if (card.breed) {
                            specialText = card.breed;
                        }
                        if (specialText) {
                            specialText = ` (${specialText})`;
                        }
                    }

                    // The pointer text to draw on the current animal entry (if any)
                    const pointerText = collectionIndex === collection.pointerPosition ? " 🔹" : "";

                    collectionString += `\`${collectionIndex + 1})\` ${animalName}${specialText}`;

                    collectionString += ` ${pointerText}\n`;

                    collectionIndex++;
                });

                embed.setDescription(collectionString);

                break;
            }
            // When the message is in info mode
            case CollectionMessageState.info: {
                buildAnimalInfo(embed, selectedAnimal);

                embed.setTitle(`\`${collection.pointerPosition + 1})\` ${embed.title}`);
                
                break;
            }
            // When the message is in card mode
            case CollectionMessageState.card: {
                buildAnimalCard(embed, selectedAnimal);

                embed.setTitle(`\`${collection.pointerPosition + 1})\` ${embed.title}`);

                break;
            }
        }

        return embed;
    }

    public async buttonPress(buttonName: string, user: User): Promise<void> {
        super.buttonPress(buttonName, user);

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
                if (this.state === CollectionMessageState.page) {
                    this.movePages(-1);
                }
                else {
                    this.movePointer(-1);
                }
                break;
            }
            case "rightArrow": {
                // Change pages if the message is in page mode, otherwise move the pointer
                if (this.state === CollectionMessageState.page) {
                    this.movePages(1);
                }
                else {
                    this.movePointer(1);
                }
                break;
            }
            case "mode": {
                if (this.state === CollectionMessageState.page) {
                    this.state = CollectionMessageState.info;
                }
                else if (this.state === CollectionMessageState.info) {
                    this.state = CollectionMessageState.card;
                }
                else {
                    this.state = CollectionMessageState.page;
                }
                break;
            }
        }

        // Rebuild the message
        try {
            this.setEmbed(await this.buildEmbed());
        }
        catch (error) {
            throw new Error(`There was an error building the embed of a collection message: ${error}`);
        }
    }
}