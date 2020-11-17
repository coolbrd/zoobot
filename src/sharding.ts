import Discord from "discord.js";
const Manager = new Discord.ShardingManager("./build/index.js");

Manager.spawn(3);
Manager.on("shardCreate", shard => console.log(`- Spawned shard ${shard.id} -`));