import mongoose, { Schema } from "mongoose";
import { BeastiarySchemaDefinition } from "../structures/schema/BeastiarySchema";

export const premiumIdSchemaDefinition: BeastiarySchemaDefinition = {
    id: {
        type: String,
        required: true
    }
};

const premiumIdSchema = new Schema(premiumIdSchemaDefinition);

export const PremiumIdModel = mongoose.model("PremiumId", premiumIdSchema);