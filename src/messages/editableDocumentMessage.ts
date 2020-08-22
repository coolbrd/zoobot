import { MessageEmbed, TextChannel, User, Message } from 'discord.js';

import { InteractiveMessage } from './interactiveMessage';
import { EditableDocument } from '../utility/userInput';
import { capitalizeFirstLetter, awaitUserNextMessage, betterSend } from '../utility/toolbox';

// A message that contains a document of fields, which themselves contain either single values of arrays of values
// Gives the user an interface for smoothly editing the contained document via reaction messages
export default class EditableDocumentMessage extends InteractiveMessage {
    // The document to provide for editing
    private readonly doc: EditableDocument;
    // The document's top level field that is currently selected

    private fieldPosition: number;
    // The name of the selected field
    private fieldSelection: string;

    // The position of the editor within a field's array of values
    private arrayPosition: number;

    // Whether or not the editor is currently within a field
    private editMode: boolean;

    constructor(channel: TextChannel, doc: EditableDocument) {
        const buttons = {
            '⬆️': 'Move pointer up',
            '⬇️': 'Move pointer down',
            '✏️': 'Edit selection',
            '⬅️': 'Back to field selection',
            '🗑️': 'Delete selected entry',
            '🆕': 'New entry'
        };

        super(channel, { buttons: buttons, lifetime: 300000 });
        this.doc = doc;

        // Start the editor at the first field
        this.fieldPosition = 0;
        this.fieldSelection = Object.keys(doc)[this.fieldPosition];

        // Start the editor at the first array position
        this.arrayPosition = 0;

        // Start the editor in field selection mode (not edit mode)
        this.editMode = false;

        this.setEmbed(this.buildEmbed());
    }

    buildEmbed(): MessageEmbed {
        const newEmbed = new MessageEmbed();

        // If the message is in field selection mode
        if (!this.editMode) {
            let fieldIndex = 0;
            // Iterate over every field in the document
            for (const editableField of Object.values(this.doc)) {
                // Select the actual value of the field rather than its wrapper object
                const fieldValue = editableField.value;

                // Format the field's value properly
                let fieldString = Array.isArray(fieldValue) ? fieldValue.join(editableField.fieldInfo.delimiter ? editableField.fieldInfo.delimiter : ', ') : fieldValue;

                // If the field's string is empty, use placeholder text so Discord doesn't get mad about any empty embed fields
                fieldString = fieldString ? fieldString : '*Empty*';

                // Deterimine if there should be an icon drawn on this field's row
                const editIcon = fieldIndex === this.fieldPosition ? '✏️' : '';

                // Capitalize and pluralize the title as needed and add the field
                newEmbed.addField(`${capitalizeFirstLetter(editableField.fieldInfo.alias)}${editableField.fieldInfo.multiple ? '(s)' : ''} ${editIcon}`, fieldString);

                fieldIndex++;
            }

            // Update button list
            this.enableButton('✏️');
            this.disableButton('⬅️');
            this.disableButton('🗑️');
            this.disableButton('🆕');
        }
        else {
            const selectedField = this.doc[this.fieldSelection];
            newEmbed.setTitle(`Now editing: ${selectedField.fieldInfo.alias}${selectedField.fieldInfo.multiple ? '(s)' : ''}`);

            let contentString = '';
            // If the selected value is an array, display it properly
            if (Array.isArray(selectedField.value)) {
                // If the array has any content within it, continue with pretty formatting
                if (selectedField.value.length > 0) {
                    let arrayIndex = 0;
                    for (const value of selectedField.value) {
                        contentString += `${value} ${arrayIndex === this.arrayPosition ? '🔹' : ''}\n`
                        arrayIndex++;
                    }
                }
            }
            // If the selected value is not an array, just a single value
            else {
                // Perform the obvious
                // TypeScript's linter doesn't automatically detect that Array.isArray(value) returning false in a branch indicates that the value must be its OTHER possible type
                // that's NOT the array one. Why? I thought you were better than this.
                contentString = selectedField.value as string;
            }
            // If the content string ended up being empty
            if (!contentString) {
                // Write it instead of just being empty
                contentString = '*Empty* 🔹';
            }

            // Complete the embed and edit the message
            newEmbed.setDescription(contentString);
            newEmbed.setFooter(this.getButtonHelpString());

            // Update button list to be more contextually appropriate
            this.enableButton('⬅️');
            this.enableButton('🗑️');
            this.enableButton('🆕');
            this.disableButton('✏️');
        }

        newEmbed.setFooter(`Valid buttons:\n${this.getButtonHelpString()}`);
        return newEmbed;
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
                    case '⬆️': {
                        this.fieldPosition = this.fieldPosition - 1 < 0 ? lastDocIndex : this.fieldPosition - 1;
                        break;
                    }
                    case '⬇️': {
                        this.fieldPosition = this.fieldPosition + 1 > lastDocIndex ? 0 : this.fieldPosition + 1;
                        break;
                    }
                    case '✏️': {
                        this.editMode = true;
                        this.arrayPosition = 0;
                        break;
                    }
                }

                // Determine the message's new selected field of the document
                this.fieldSelection = Object.keys(this.doc)[this.fieldPosition];

                break;
            }
            // While the user is selecting an array element to edit
            case true: {
                // Edit mode button behavior
                switch(button) {
                    case '⬆️': {
                        // Move up if the selection is an array
                        if (Array.isArray(selection)) {
                            this.arrayPosition = this.arrayPosition - 1 < 0 ? selection.length - 1 : this.arrayPosition - 1;
                        }
                        break;
                    }
                    // Move down if the selection is an array
                    case '⬇️': {
                        if (Array.isArray(selection)) {
                            this.arrayPosition = this.arrayPosition + 1 > selection.length - 1 ? 0 : this.arrayPosition + 1;
                        }
                        break;
                    }
                    // Leave the selection and return to field selection
                    case '⬅️': {
                        this.editMode = false;
                        break;
                    }
                    // Delete the selected array element
                    case '🗑️': {
                        if (Array.isArray(selection)) {
                            selection.splice(this.arrayPosition, 1);
                            this.arrayPosition - 1;
                        }
                        else {
                            this.doc[this.fieldSelection].value = undefined;
                        }
                        break;
                    }
                    // Add a new array element above the pointer
                    case '🆕': {
                        await betterSend(this.channel, 'Send your input to insert into the current field:');

                        const newElement = await awaitUserNextMessage(this.channel, user, 300000);

                        if (newElement) {
                            if (Array.isArray(selection)) {
                                selection.splice(this.arrayPosition, 0, newElement.content);
                            }
                            else {
                                this.doc[this.fieldSelection].value = newElement.content;
                            }
                        }
                        else {
                            betterSend(this.channel, 'Time limit expired. No changes have been made.');
                        }
                    }
                }
            }
        }

        // Update the message's embed
        this.setEmbed(this.buildEmbed());
    }

    protected async deactivate(): Promise<void> {
        // Inherit parent deactivation behavior
        super.deactivate();

        betterSend(this.channel, 'Time limit expired, approval process aborted.');

        const message = this.getMessage() as Message;
        const embed = message.embeds[0];

        // Get the embed's footer
        const footer = embed.footer;

        // Append the deactivated info to the end of the message's footer
        const newEmbed = embed.setFooter(`${footer ? `${footer.text} ` : ''}(deactivated)`);

        try {
            // Update the message
            await message.edit(newEmbed);
        }
        catch (error) {
            console.error('Error trying to edit an embed on an interactive message.', error);
        }
    }
}