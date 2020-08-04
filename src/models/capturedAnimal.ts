import mongoose from "mongoose";

const Schema = mongoose.Schema;

const CapturedAnimalSchema = new Schema({
    species: {
        type: String,
        required: true
    },
    image: {
        type: Number,
        required: true
    },
    mutations: {
        type: Array,
        required: true
    },
    stats: {
        type: Array,
        required: true
    },
    nickname: {
        type: String,
        required: false
    },
    favorite: {
        type: Boolean,
        required: true
    },
    dateCaptured: {
        type: Number,
        required: true
    },
    captor: {
        type: Number,
        required: true
    },
    homeRegion: {
        type: String,
        required: true
    }
});

export default mongoose.model('CapturedAnimal', CapturedAnimalSchema);