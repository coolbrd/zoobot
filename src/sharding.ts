import { stripIndent } from "common-tags";
import Discord from "discord.js";
import mongoose from "mongoose";
import { MONGODB_PATH } from "./config/secrets";
import DatabaseIntegrityChecker from "./structures/DatabaseIntegrityChecker";

mongoose.connect(MONGODB_PATH, { dbName: "zoobot", useNewUrlParser: true, useUnifiedTopology: true }).then(() => {
    console.log("Beginning database integrity check");

    const integrityChecker = new DatabaseIntegrityChecker();

    integrityChecker.run().then(errors => {
        if (errors.length > 0) {
            console.log("Database integrity error(s) detected:");
            errors.forEach(currentError => {
                let errorString = currentError.info;

                currentError.documents.forEach(currentErrorDocument => {
                    errorString += `\nDocument:\n${currentErrorDocument.toString()}`;
                });
                console.log(stripIndent`
                    Error:

                    ${errorString}
                `);
            });
        }
        else {
            console.log("Database integrity check passed");
        }

        const manager = new Discord.ShardingManager("./build/index.js", { respawn: false });
            
        manager.spawn(1);
        manager.on("shardCreate", shard => {
            console.log(`- Spawned shard ${shard.id} -`);

            shard.on("message", message => {
                if (message === "exit") {
                    process.exit();
                }
            });
        });
    }).catch(error => {
        throw new Error(stripIndent`
            There was an error running the database integrity check.

            ${error}
        `);
    });
});