import { CommandConfig } from "../../../typings";
import { CommandType } from "wokcommands";
import { ApplicationCommandOptionType } from "discord-api-types/v10";
import BahamutClient from "../../modules/BahamutClient";
import Discord from "discord.js";
import { getGuildSettings } from "../../lib/getFunctions";
import { resolveUser } from "../../lib/resolveFunctions";

const config: CommandConfig = {
    name: "avatar",
    type: CommandType.BOTH,
    testOnly: false,
    description: "Get a users avatar.",
    minArgs: 0,
    expectedArgs: "[user]",
    options: [
        {
            name: "user",
            description: "Request avatar for this user.",
            type: ApplicationCommandOptionType.User,
            required: false,
        },
    ],
    category: "Miscellaneous",
    guildOnly: true,
    deferReply: false,
};

export default {
    ...config,
    callback: async ({ client, channel, message, args, member }: { client: BahamutClient, channel: Discord.TextChannel, message: Discord.Message, args: any[], member: Discord.GuildMember }) => {
        const settings = await getGuildSettings(client, channel.guild);
        // Abort if module is disabled
        if (settings.disabled_categories.includes("miscellaneous")) return;

        let target;

        if (args.length > 0) {
            if (message && message.mentions.members!.size > 0) {
                target = message.mentions.members?.first();
            }
            else if (!message && args.length > 0) {
                if (args[0] instanceof Discord.GuildMember) {
                    target = args[0];
                }
                else {
                    target = await resolveUser(client, args[0], channel.guild);
                }
            }
            else {
                target = member;
            }
        }
        else {
            target = member;
        }

        return target?.user.displayAvatarURL();
    },
};