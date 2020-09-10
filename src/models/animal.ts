import mongoose, { Schema } from 'mongoose';

export const animalSchema = new Schema({
    species: {
        type: Schema.Types.ObjectId,
        ref: 'Species',
        required: true
    },
    owner: {
        type: String,
        required: true
    },
    server: {
        type: String,
        required: true
    },
    image: {
        type: Number,
        required: true
    },
    nickname: {
        type: String,
        required: false
    },
    experience: {
        type: Number,
        required: true
    }
});

export const Animal = mongoose.model('Animal', animalSchema);