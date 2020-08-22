import { User, APIMessage, Message, TextChannel, MessageEmbed } from 'discord.js';

import Command from './commandInterface';
import CommandParser from '../utility/commandParser';
import { PendingSpecies } from '../models/pendingSpecies';
import { betterSend, capitalizeFirstLetter } from '../utility/toolbox';
import { InteractiveMessage } from '../messages/interactiveMessage';
import { speciesFieldInfo } from '../models/species';
import { FieldInfo } from '../utility/userInput';

export class ApprovePendingSpeciesCommand implements Command {
    readonly commandNames = [`approve`, `approvespecies`];

    help(commandPrefix: string): string {
        return `Use ${commandPrefix}approve to begin the process of reviewing and approving a species submission.`;
    }

    async run(parsedUserCommand: CommandParser): Promise<void> {
        const channel = parsedUserCommand.originalMessage.channel as TextChannel;
        
        const fullSearchTerm = parsedUserCommand.args.join(` `);

        const searchResult = await PendingSpecies.findOne({ 'commonNames.0': fullSearchTerm });

        if (!searchResult) {
            betterSend(channel, `No pending species submission with the common name '${fullSearchTerm}' could be found.`);
            return;
        }

        const pendingSubmission = searchResult.toObject();

        const editableDocument = {};
        for (const key of Object.keys(speciesFieldInfo)) {
            if (!pendingSubmission[key]) {
                continue;
            }

            Object.defineProperty(editableDocument, key, {
                value: {
                    fieldInfo: speciesFieldInfo[key],
                    value: pendingSubmission[key]
                },
                enumerable: true,
                writable: false
            });
        }

        EditableDocumentMessage.init(channel, editableDocument);
    }
}

interface EditableField {
    fieldInfo: FieldInfo,
    value: string | string[]
}

interface EditableDocument {
    [path: string]: EditableField
}

// A message that contains a document of fields, which themselves contain either single values of arrays of values
// Gives the user an interface for smoothly editing the contained document via reaction messages
export default class EditableDocumentMessage extends InteractiveMessage {
    // The document to provide for editing
    private readonly doc: EditableDocument;
    // The document's top level field that is currently selected
    private fieldPosition = 0;
    // The name of the selected field
    private fieldSelection: string;
    // Whether or not the editor is currently within a field
    private editMode = false;
    // The position of the editor within a field's array of values
    private arrayPosition = 0;

    protected constructor(message: Message, initialButtons: string[] | { [path: string]: string }, lifetime: number, doc: EditableDocument) {
        super(message, initialButtons, lifetime);
        this.doc = doc;
        this.fieldSelection = Object.keys(this.doc)[0];
    }

    // Initializes an editable message in a given channel
    static async init(channel: TextChannel, doc: EditableDocument): Promise<EditableDocumentMessage> {
        // The set of buttons that this message will be initialized with
        const initialButtons: { [path: string]: string } = {
            '⬆️': 'Move pointer up',
            '⬇️': 'Move pointer down',
            '✏️': 'Edit selection'
        };
        // The timeout period that will trigger deactivation after inactivity
        const lifetime = 60000;

        // Build the initial embed
        const docEmbed = EditableDocumentMessage.buildEmbed(doc, 0);

        // Wrap the embed in a message for eventual sending
        const content = new APIMessage(channel, { embed: docEmbed });

        let message;
        try {
            // Attempt to send and build the message
            message = await this.build(content, channel, initialButtons) as Message;
        }
        catch (error) {
            throw new Error(`Error building the base message for an editable document message.`);
        }

        // Once the message is sent, initialize this instance as a proper editable document
        return new EditableDocumentMessage(message, initialButtons, lifetime, doc);
    }

    // Builds the embed that displays the submission's current information with the edit icon
    // This is static because it needs to be called once in this class' init function
    // If there's a way to get around that and make this a proper method please tell me. I don't like it being this way.
    static buildEmbed(doc: EditableDocument, position: number): MessageEmbed {
        const docEmbed = new MessageEmbed();

        let fieldIndex = 0;
        // Iterate over every field in the document
        for (const editableField of Object.values(doc)) {
            // Select the actual value of the field rather than its wrapper object
            const fieldValue = editableField.value;

            // Format the field's value properly
            let fieldString = Array.isArray(fieldValue) ? fieldValue.join(editableField.fieldInfo.delimiter ? editableField.fieldInfo.delimiter : `, `) : fieldValue;

            // If the field's string is empty, use placeholder text so Discord doesn't get mad about any empty embed fields
            fieldString = fieldString ? fieldString : `*Empty*`;

            // Deterimine if there should be an icon drawn on this field's row
            const editIcon = fieldIndex === position ? `✏️` : ``;

            // Capitalize and pluralize the title as needed and add the field
            docEmbed.addField(`${capitalizeFirstLetter(editableField.fieldInfo.alias)}${editableField.fieldInfo.multiple ? `(s)` : ``} ${editIcon}`, fieldString);

            fieldIndex++;
        }

        return docEmbed;
    }

    // Refreshes the message's embed based on changes made in the document or the editor
    // Called pretty much every time after the user presses anything
    async rebuildEmbed(): Promise<void> {
        // If the editor is in edit mode (the user has selected a field to edit)
        if (this.editMode) {
            // Build the message's embed according to some behavior other than that of buildEmbed

            const editEmbed = new MessageEmbed();
            const selectedField = this.doc[this.fieldSelection];
            editEmbed.setTitle(`Now editing: ${selectedField.fieldInfo.alias}${selectedField.fieldInfo.multiple ? `(s)` : ``}`);

            let contentString = ``;
            // If the selected value is an array, display it properly
            if (Array.isArray(selectedField.value)) {
                // If the array has any content within it, continue with pretty formatting
                if (selectedField.value.length > 0) {
                    let arrayIndex = 0;
                    for (const value of selectedField.value) {
                        contentString += `${value} ${arrayIndex === this.arrayPosition ? `🔹` : ``}\n`
                        arrayIndex++;
                    }
                }
                // If the array is empty, don't waste any time and just give it a nice placeholder message
                else {
                    contentString = `*Empty* 🔹`;
                }
            }
            // If the selected value is not an array, just a single value
            else {
                // Perform the obvious
                // TypeScript's linter doesn't automatically detect that Array.isArray(value) returning false in a branch indicates that the value must be its OTHER possible type
                // that's NOT the array one. Why? I thought you were better than this.
                contentString = selectedField.value as string;
            }

            // Complete the embed and edit the message
            editEmbed.setDescription(contentString);
            editEmbed.setFooter(this.getButtonHelpString());
            this.getMessage().edit(editEmbed);

            // Add buttons that pertain to editing field information
            this.addButton(`⬅️`, `Back to field selection`);
            this.addButton(`🗑️`, `Delete selected entry`);
            this.addButton(`🆕`, `New entry`);
        }
        // If the document is not in edit mode (so the user is still selecting a field to edit)
        else {
            // Build and update the message's embed
            this.getMessage().edit(EditableDocumentMessage.buildEmbed(this.doc, this.fieldPosition));
        }

        // Determine the message's new selected field of the document
        this.fieldSelection = Object.keys(this.doc)[this.fieldPosition];
    }

    async buttonPress(button: string, user: User): Promise<void> {
        // Make sure the timer is reset whenever a button is pressed
        super.buttonPress(button, user);

        const selection = this.doc[this.fieldSelection].value;

        // Edit mode state behavior
        switch(this.editMode) {
            // While the user is selecting a field to edit
            case false: {
                // The last index of a field within the editable document that can be used. Used for looping from one end to the other.
                const lastDocIndex = Object.values(this.doc).length - 1;

                // Field selection mode button behavior
                switch(button) {
                    case `⬆️`: {
                        this.fieldPosition = this.fieldPosition - 1 < 0 ? lastDocIndex : this.fieldPosition - 1;
                        break;
                    }
                    case `⬇️`: {
                        this.fieldPosition = this.fieldPosition + 1 > lastDocIndex ? 0 : this.fieldPosition + 1;
                        break;
                    }
                    case `✏️`: {
                        this.editMode = true;
                        this.arrayPosition = 0;
                        break;
                    }
                }
                break;
            }
            // While the user is selecting an array element to edit
            case true: {
                // Edit mode button behavior
                switch(button) {
                    case `⬆️`: {
                        if (Array.isArray(selection)) {
                            this.arrayPosition = this.arrayPosition - 1 < 0 ? selection.length - 1 : this.arrayPosition - 1;
                        }
                        break;
                    }
                    case `⬇️`: {
                        if (Array.isArray(selection)) {
                            this.arrayPosition = this.arrayPosition + 1 > selection.length - 1 ? 0 : this.arrayPosition + 1;
                        }
                        break;
                    }
                    case `⬅️`: {
                        this.editMode = false;
                        break;
                    }
                    case `🗑️`: {
                        if (Array.isArray(selection)) {
                            selection.splice(this.arrayPosition, 1);
                            this.arrayPosition - 1;
                        }
                        break;
                    }
                }
            }
        }

        // Rebuild the embed after every button press
        this.rebuildEmbed();
    }

    protected async deactivate(): Promise<void> {
        // Inherit parent deactivation behavior
        super.deactivate();

        const embed = this.getMessage().embeds[0];

        // Get the embed's footer
        const footer = embed.footer;

        // Append the deactivated info to the end of the message's footer
        const newEmbed = embed.setFooter(`${footer ? `${footer.text} ` : ``}(deactivated)`);

        try {
            // Update the message
            await this.getMessage().edit(newEmbed);
        }
        catch (error) {
            console.error(`Error trying to edit an embed on an interactive message.`, error);
        }
    }
}