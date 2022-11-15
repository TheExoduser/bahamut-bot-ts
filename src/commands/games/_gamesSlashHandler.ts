import { getAllJSFiles } from "../../lib/toolFunctions";
import { CommandConfig } from "../../../typings";
import { CommandType } from "wokcommands";
import Discord from "discord.js";
import BahamutClient from "../../modules/BahamutClient";
import { handleErrorResponseToMessage } from "../../lib/messageHandlers";

const allGamesCommands = (() => getAllJSFiles(__dirname).filter(e => e.filePath !== __filename))();

// This is a Slash command handler for all game commands

const config: CommandConfig = {
    name: "games",
    type: CommandType.SLASH,
    description: "Different commands for Discord games.",
    options: (() => {
        return allGamesCommands.filter(e => e.fileContents.type !== CommandType.SLASH).map(e => {
            return {
                name: e.fileContents.name,
                type: Discord.ApplicationCommandOptionType.Subcommand,
                description: e.fileContents.description,
                options: e.fileContents.options || [],
            };
        });
    })(),
    minArgs: 0,
    category: "Games",
    guildOnly: true,
    testOnly: true,
    deferReply: true,
};

export default {
    ...config,
    autocomplete: (command: string, optionName: string, interaction: Discord.CommandInteraction) => {
        try {
            // @ts-ignore
            const cmdArr = allGamesCommands.filter(e => e.fileContents.name === interaction.options.getSubcommand(false));

            if (!cmdArr || cmdArr.length < 1) return [];

            const cmd = cmdArr[0];

            // Call subcommand with all params
            return cmd.fileContents.autocomplete(command, optionName, interaction);
        } catch (ex) {
            return [];
        }
    },
    callback: async ({ message, args, client, interaction, channel, ...rest }: { message: Discord.Message, args: any[], client: BahamutClient, interaction: Discord.CommandInteraction, channel: Discord.TextChannel }) => {
        try {
            // @ts-ignore
            const cmdArr = allGamesCommands.filter(e => e.fileContents.name === interaction.options.getSubcommand(false));
            if (!cmdArr || cmdArr.length < 1) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "This command is not available!");

            const cmd = cmdArr[0];

            // Call subcommand with all params
            return await cmd.fileContents.callback({ message, args, client, interaction, channel, ...rest });
        } catch (ex) {
            console.error("Error running Games slash command handler:", ex);
            return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "An internal error occurred while doing that. Please try again later.");
        }
    },
};