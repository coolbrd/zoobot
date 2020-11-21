import Discord from "discord.js";

const manager = new Discord.ShardingManager("./build/index.js", { respawn: false });

manager.spawn(2);
manager.on("shardCreate", shard => {
    console.log(`- Spawned shard ${shard.id} -`);
});