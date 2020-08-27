import { MessageEmbed, TextChannel, User, Message, DMChannel } from 'discord.js';

import { InteractiveMessage } from './interactiveMessage';
import EditableDocument, { EditableDocumentField } from '../utility/editableDocument';
import { capitalizeFirstLetter, betterSend, awaitUserNextMessage, safeDeleteMessage } from '../utility/toolbox';
import { PointedArray } from '../utility/pointedArray';

// An interactive message that allows the user to edit and submit a configurable document
export default class EditableDocumentMessage extends InteractiveMessage {
    // The top-level document to edit and eventually submit
    private readonly document: EditableDocument;

    // The stack trace of where within the document we are
    private selection: EditableDocumentField[] = [];

    constructor(channel: TextChannel | DMChannel, document: EditableDocument, alias?: string) {
        super(channel, { buttons: [
            {
                name: 'pointerUp',
                emoji: '⬆️',
                helpMessage: 'Pointer up'
            },
            {
                name: 'pointerDown',
                emoji: '⬇️',
                helpMessage: 'Pointer down'
            },
            {
                name: 'edit',
                emoji: '✏️',
                helpMessage: 'Edit selection'
            },
            {
                name: 'back',
                emoji: '⬅️',
                helpMessage: 'Back'
            },
            {
                name: 'delete',
                emoji: '🗑️',
                helpMessage: 'Delete entry'
            },
            {
                name: 'new',
                emoji: '🆕',
                helpMessage: 'New entry'
            },
            {
                name: 'submit',
                emoji: '✅',
                helpMessage: 'Approve'
            }
        ], lifetime: 300000 });

        this.document = document;
        // Start navigation at the top level document
        // This needs to be in an EditableDocumentFieldInfo wrapper so it looks like a regular field and can be operated on like one
        // However, this field is essentially anonymous. This makes it unlike the richer, predefined fields within the document.
        // No assumptions about type correctness should be made about this top-level field
        this.selection.push({
            fieldInfo: {
                alias: alias || 'document',
                type: 'document'
            },
            value: this.document
        });

        // Build the embed according to the top-level document
        this.setEmbed(this.buildEmbed());
    }

    // Gets this message's currently selected field
    private getSelection(): EditableDocumentField {
        // Return the field on the top of the stack
        return this.selection[this.selection.length - 1];
    }

    // Sets the field to select and edit
    // Puts it on top of the stack so the back button will properly navigate to wherever the user was before
    private setSelection(selection: EditableDocumentField): void {
        this.selection.push(selection);
    }

    // Navigates up one level of the selection stack trace
    private backOneLevel(): void {
        // Don't go anywhere if we're at the top level
        if (this.selection.length > 1) {
            this.selection.pop();
        }
    }

    // Build the message embed that represents the currently selected field
    private buildEmbed(): MessageEmbed {
        const newEmbed = new MessageEmbed();

        // The currently selected EditableDocumentFieldInfo object
        const selection = this.getSelection();
        // Tell the user where they are
        newEmbed.setTitle(`Now editing: ${capitalizeFirstLetter(selection.fieldInfo.alias)}`);

        // If the current selection is a document (like the top-level one)
        if (selection.value instanceof EditableDocument) {
            // Get the document
            const document = selection.value;

            // Iterate over every field in the document
            for (const [key, field] of document.fields.entries()) {
                // Whether or not the current field is the one that's selected by the editor
                let selected = false;
                // If the name of the current field is marked as the document's currently selected field
                if (key === document.fieldNames.selection()) {
                    selected = true;
                }
                // Add a field representing the current field of the document, drawing an edit icon if it's the selected field
                newEmbed.addField(`${capitalizeFirstLetter(field.fieldInfo.alias)}${selected ? ' * ' : ''}`, field.value.toString() || '*Empty*');
            }

            // Appropriately manage buttons for the current context (disabled buttons have no use here so don't show their help messages)
            this.enableButton('pointerUp');
            this.enableButton('pointerDown');
            this.enableButton('edit');
            this.disableButton('back');
            this.disableButton('delete');
            this.disableButton('new');

            // If we're on the top level document
            if (this.selection.length === 1) {
                // Enable the submit button
                this.enableButton('submit');
            }
            // Disable the submit button's information and functionality otherwise
            else {
                this.disableButton('submit');
            }
        }
        // If the selected value is an array of elements
        else if (selection.value instanceof PointedArray) {
            let content = '';
            let arrayIndex = 0;
            // Iterate over every item in the array
            for (const value of selection.value.getArray()) {
                // If the current element is at the selected index
                const selected = selection.value.getPointerPosition() === arrayIndex;
                // Write the value of the element and draw the edit icon if it's selected
                content += `${value.toString()} ${selected ? ' * ' : ''}\n`;
                arrayIndex++;
            }

            // If no information was added, don't just display nothing
            if (!content) {
                content = '*Empty*';
            }

            newEmbed.setDescription(content);

            // Update button context
            this.enableButton('pointerUp');
            this.enableButton('pointerDown');
            this.enableButton('back');
            this.enableButton('delete');
            this.enableButton('new');

            this.disableButton('submit');

            // If the array stores documents, use the edit button
            if (selection.fieldInfo.arrayType !== 'string') {
                this.enableButton('edit');
            }
            // Otherwise disable it because it doesn't do anything for strings
            else {
                this.disableButton('edit');
            }
        }
        // If the selected field is of an unexpected type
        else {
            throw new Error('Unexpected type of data selected by an EditableDocumentMessage');
        }

        // Add button help information to the footer
        newEmbed.setFooter(this.getButtonHelpString());

        return newEmbed;
    }

    // Whenever one of the active buttons is pressed
    public async buttonPress(buttonName: string, user: User): Promise<void> {
        // Make sure the timer is reset whenever a button is pressed
        super.buttonPress(buttonName, user);

        const selection = this.getSelection();

        // Button behavior
        switch (buttonName) {
            // Moves the pointer up
            case 'pointerUp': {
                // Decrement the document's pointer if that's what's selected
                if (selection.value instanceof EditableDocument) {
                    selection.value.fieldNames.decrementPointer();
                }
                // Decrement the array's pointer if that's what's selected
                else if (selection.value instanceof PointedArray) {
                    selection.value.decrementPointer();
                }
                break;
            }
            // Moves the pointer down
            case 'pointerDown': {
                // Increment the document's pointer if that's what's selected
                if (selection.value instanceof EditableDocument) {
                    selection.value.fieldNames.incrementPointer();
                }
                // Increment the array's pointer if that's what's selected
                else if (selection.value instanceof PointedArray) {
                    selection.value.incrementPointer();
                }
                break;
            }
            // Selects the currently selected document or array and navigates inside of it to edit it
            // Also edits string and boolean values
            case 'edit': {
                // If the editor is currently editing a document
                if (selection.value instanceof EditableDocument) {
                    // Get the selected field from within the selected document
                    const selectedField = selection.value.getSelection();
                    // If the field is something that can be navigated inside of
                    if (selectedField.value instanceof EditableDocument || selectedField.value instanceof PointedArray) {
                        this.setSelection(selectedField);
                    }
                    // If the field is just a string
                    else if (typeof selectedField.value === 'string') {
                        // Get the user's input for the field
                        const promptString = selectedField.fieldInfo.prompt || 'Enter the information that you would like to insert into this field.'
                        const promptMessage = await betterSend(this.channel, promptString);

                        const responseMessage = await awaitUserNextMessage(this.channel, user, 60000);

                        // If the user responded
                        if (responseMessage) {
                            // Set the given input information as the field's new value
                            selectedField.value = responseMessage.content;

                            safeDeleteMessage(responseMessage);
                        }

                        safeDeleteMessage(promptMessage);
                    }
                    // If the selected field is a boolean value
                    else if (typeof selectedField.value === 'boolean') {
                        // Just toggle it
                        selectedField.value = !selectedField.value;
                    }
                    // If the selected field is something that it shouldn't be
                    else {
                        throw new Error('Unexpected type in EditableDocument');
                    }
                }
                // If the editor is currently editing an array
                else if (selection.value instanceof PointedArray) {
                    // Get the current selection of the array
                    const selectedElement = selection.value.selection();
                    // If the array element is a document
                    if (selectedElement instanceof EditableDocument) {
                        // Select the document for further editing
                        this.setSelection({
                            fieldInfo: {
                                alias: `Field within: ${selection.fieldInfo.alias}`,
                                type: 'document'
                            },
                            value: selectedElement
                        });
                    }
                }
                break;
            }
            // Navigates up one level in the editor
            case 'back': {
                this.backOneLevel();
                break;
            }
            // Adds a new array element to the selected array
            case 'new': {
                // Make sure the selection is an array and not a document
                if (selection.value instanceof PointedArray) {
                    // If the array field is missing its type
                    if (!selection.fieldInfo.arrayType) {
                        throw new Error('Found no type for a PointedArray when one was expected');
                    }

                    // If the array contains strings
                    if (selection.fieldInfo.arrayType === 'string') {
                        // Get user input for a new string to insert and add it
                        const promptString = selection.fieldInfo.prompt || 'Enter your input for this new entry.';
                        const promptMessage = await betterSend(this.channel, promptString);

                        const responseMessage = await awaitUserNextMessage(this.channel, user, 60000);

                        if (responseMessage) {
                            selection.value.addAtPointer(responseMessage.content);

                            safeDeleteMessage(responseMessage);
                        }

                        safeDeleteMessage(promptMessage);
                    }
                    // If the array contains documents
                    else {
                        // Create an empty document of the array's document type and insert it
                        selection.value.addAtPointer(new EditableDocument(selection.fieldInfo.arrayType));
                    }
                }
            }
        }

        // Update the message's embed
        this.setEmbed(this.buildEmbed());
    }

    // Gets the document immediately after the user submits it
    public getNextSubmission(): Promise<EditableDocument | undefined> {
        // Construct a promise that will resolve when the document is provided
        const documentPromise: Promise<EditableDocument | undefined> = new Promise(resolve => {
            // If the message deactivates before the document is submitted
            this.emitter.once('deactivated', () => {
                resolve(undefined);
            });

            // When the user submits the document
            this.emitter.once('submit', (document: EditableDocument) => {
                // Return the final document
                resolve(document);
            });
        });
        
        return documentPromise;
    }

    protected async deactivate(): Promise<void> {
        // Inherit parent deactivation behavior
        super.deactivate();

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