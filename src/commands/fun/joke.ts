import axios from "axios";
import { CommandConfig } from "../../../typings";
import { CommandType } from "wokcommands";
import BahamutClient from "../../modules/BahamutClient";
import Discord from "discord.js";
import { handleErrorResponseToMessage, handleResponseToMessage } from "../../lib/messageHandlers";

const config: CommandConfig = {
    name: "joke",
    type: CommandType.LEGACY,
    description: "Get a random joke.",
    category: "Fun",
    guildOnly: true,
    testOnly: false,
    deferReply: true,
};

export default {
    ...config,
    callback: async ({
                         client,
                         message,
                         interaction,
                     }: { client: BahamutClient, message: Discord.Message, interaction: Discord.CommandInteraction }) => {
        try {
            const { data: json } = await axios.get("https://official-joke-api.appspot.com/jokes/random");

            if (!json || typeof json !== "object") return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "Unable to fetch a joke. Please try again later.");
            if (!json.setup || !json.punchline) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "Error while fetching joke. Please try again later.");

            return handleResponseToMessage(client, message || interaction, false, config.deferReply, {
                embeds: [
                    new Discord.EmbedBuilder()
                        // eslint-disable-next-line no-useless-escape
                        .setTitle("\:rofl: Joke")
                        .setDescription(`> ${json.setup}\n\n**${json.punchline}**`),
                ],
            });
        } catch (err) {
            console.error("Error loading joke:", err);
            return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "Error while fetching joke.");
        }
    },
};