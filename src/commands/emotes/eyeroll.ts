import { CommandConfig } from "../../../typings";
import { CommandType } from "wokcommands";
import BahamutClient from "../../modules/BahamutClient";
import Discord from "discord.js";
import { handleErrorResponseToMessage, handleResponseToMessage } from "../../lib/messageHandlers";
import { randomIntBetween } from "../../lib/toolFunctions";
import lang from "../../lib/languageMessageHandlers";

const config: CommandConfig = {
    name: "eyeroll",
    type: CommandType.LEGACY,
    testOnly: false,
    description: "You are rolling your eyes",
    minArgs: 0,
    category: "Emotes",
    guildOnly: true,
    deferReply: true,
};

export default {
    ...config,
    callback: async ({ client, message, channel, member, interaction }: { client: BahamutClient, message: Discord.Message, channel: Discord.TextChannel, member: Discord.GuildMember, interaction: Discord.CommandInteraction }) => {
        try {
            const res = await client.bahamut.tenor.Search.Query("eyeroll", "30");

            const rand = randomIntBetween(0, 29);
            const post = res.results[rand];

            return handleResponseToMessage(client, message || interaction, false, config.deferReply, {
                embeds: [
                    new Discord.EmbedBuilder()
                        .setDescription(await lang.getMessage(client, channel.guild, "commands_emotes_eyeroll_text", {
                            user1: member.toString(),
                        }) || "")
                        .setImage(post.media[0].gif.url)
                        .setFooter({ text: "Via Tenor" }),
                ],
            });
        } catch (ex) {
            console.error("Error fetching gif from Tenor:", ex);
            return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, await lang.getMessage(client, channel.guild, "error_fetching_gif"));
        }
    },
};