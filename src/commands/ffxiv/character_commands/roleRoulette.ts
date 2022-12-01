import Discord from "discord.js";
import { CommandConfig } from "../../../../typings";
import { CommandType, CooldownTypes } from "wokcommands";
import BahamutClient from "../../../modules/BahamutClient";
import fs from "fs";
import { resolve } from "path";
import { getGuildSettings } from "../../../lib/getFunctions";
import {
    createMissingParamsErrorResponse,
    handleErrorResponseToMessage,
    handleResponseToMessage,
} from "../../../lib/messageHandlers";
import { resolveUser } from "../../../lib/resolveFunctions";
import { parseBool } from "../../../lib/parseFunctions";
import { randomIntBetween } from "../../../lib/toolFunctions";
// Non ES imports
const XIVAPI = require("@xivapi/js");

const allServers: string[] = (() => {
    const path = resolve("cache/ffxiv_servers.json");
    if (fs.existsSync(path)) {
        return require(path);
    } else {
        return[];
    }
})();

const config: CommandConfig = {
    name: "roleroulette",
    type: CommandType.LEGACY,
    description: "Assign random job roles for group members.",
    minArgs: 2,
    expectedArgs: "<max-rank-only> [user-1] [user-2] [user-3] [user-4] [user-5] [user-6] [user-7] [user-8]",
    options: [
        {
            name: "max-rank-only",
            description: "Only choose between max rank jobs.",
            type: Discord.ApplicationCommandOptionType.Boolean,
            required: true,
        },
        {
            name: "user-1",
            description: "First group member.",
            type: Discord.ApplicationCommandOptionType.User,
            required: false,
        },
        {
            name: "user-2",
            description: "Second group member.",
            type: Discord.ApplicationCommandOptionType.User,
            required: false,
        },
        {
            name: "user-3",
            description: "Third group member.",
            type: Discord.ApplicationCommandOptionType.User,
            required: false,
        },
        {
            name: "user-4",
            description: "Fourth group member.",
            type: Discord.ApplicationCommandOptionType.User,
            required: false,
        },
        {
            name: "user-5",
            description: "Fifth group member.",
            type: Discord.ApplicationCommandOptionType.User,
            required: false,
        },
        {
            name: "user-6",
            description: "Sixth group member.",
            type: Discord.ApplicationCommandOptionType.User,
            required: false,
        },
        {
            name: "user-7",
            description: "Seventh group member.",
            type: Discord.ApplicationCommandOptionType.User,
            required: false,
        },
        {
            name: "user-8",
            description: "Eighth group member.",
            type: Discord.ApplicationCommandOptionType.User,
            required: false,
        },
    ],
    category: "FFXIV",
    cooldowns: {
        type: CooldownTypes.perUserPerGuild,
        duration: "10 s",
    },
    guildOnly: true,
    testOnly: false,
    deferReply: true,
};

export default {
    ...config,
    autocomplete: () => {
        return allServers;
    },
    callback: async ({ client, message, channel, args, interaction }: { client: BahamutClient, message: Discord.Message, channel: Discord.TextChannel, args: any[], interaction: Discord.CommandInteraction }) => {
        const settings = await getGuildSettings(client, channel.guild);
        // Abort if module is disabled
        if (settings.disabled_categories.includes("ffxiv")) return;

        let response = null;
        const xiv = new XIVAPI({
            private_key: client.bahamut.config.xivapi_token,
            language: settings.language,
        }), maxRankOnly = parseBool(args[0]), users = args.slice(1), userMap = new Map<string, any>(), resultMap = new Map<string, any | null>();

        if (args.length <= 1) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, createMissingParamsErrorResponse(client, config));

        for (let i = 0; (i <= users.length && i <= 7); i++) {
            let user = null, userName = null;

            if (users[i] instanceof Discord.GuildMember) {
                userName = users[i].displayName;
                user = await client.bahamut.dbHandler.ffxiv.getDBGuildFFXIVCharacterID(channel.guild, users[i]);
            } else {
                const tempUser = await resolveUser(client, users[i], channel.guild);
                if (tempUser) {
                    userName = tempUser.displayName;
                    user = await client.bahamut.dbHandler.ffxiv.getDBGuildFFXIVCharacterID(channel.guild, tempUser);
                } else {
                    userName = users[i];
                }
            }

            userMap.set(userName, user);
        }

        if (userMap.size <= 0) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "Error fetching FFXIV character id's. Please try again later!");

        // Fetch user data for all group members
        for (const [name, char] of userMap.entries()) {
            if (!char) {
                resultMap.set(name, null);
                continue;
            }

            response = await xiv.character.get(char, {
                extended: true,
            });

            if (response) {
                if (response.Error) continue;

                const jobs: { [key: string]: any } = {},
                    notJobs = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
                let userJobs = [];

                for (const job of response.Character.ClassJobs) {
                    jobs[job.Class.ID] = job;
                }

                if (maxRankOnly) {
                    userJobs = (response.Character.ClassJobs).filter((e: { Class: { ID: number; }; Level: number; }) => !notJobs.includes(e.Class.ID) && e.Level >= 90);
                } else {
                    userJobs = (response.Character.ClassJobs).filter((e: { Class: { ID: number; }; }) => !notJobs.includes(e.Class.ID));
                }

                resultMap.set(name, userJobs[randomIntBetween(0, userJobs.length - 1)]);
            } else {
                resultMap.set(name, null);
            }
        }

        if (resultMap.size <= 0) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "No valid results found. Please try again later!");

        const embed = new Discord.EmbedBuilder()
            .setAuthor({ name: "Role Roulette", iconURL: client.bahamut.config.game_icons.ffxiv })
            .setDescription("The following roles have been chosen for you!\n\n\n");

        for (const [name, job] of resultMap.entries()) {
            if (!name) continue;

            embed.addFields({ name: name, value: `> ${job ? job.UnlockedState.Name : "No matching job found."}`, inline: false });
        }

        return handleResponseToMessage(client, message || interaction, false, config.deferReply, {
            embeds: [embed],
        });
    },
};