import emoji from "node-emoji";
import { CommandType } from "wokcommands";
import { formatDuration } from "../../lib/durationFunctions";
import { encodeYoutubeURL } from "../../lib/toolFunctions";
import BahamutClient from "../../modules/BahamutClient";
import Discord from "discord.js";
import { getGuildSettings } from "../../lib/getFunctions";
import {
    handleErrorResponseToMessage, handleResponseToMessage,
    handleSuccessResponseToMessage,
} from "../../lib/messageHandlers";
import { CommandConfig, ExtendedTrack } from "../../../typings";
import { BahamutCommandPreChecker, PreCheckType } from "../../modules/BahamutCommandPreChecker";
// No ES import support
const radio = require("node-internet-radio");

const config: CommandConfig = {
    name: "dmnowplaying",
    aliases: ["dmnp"],
    type: CommandType.LEGACY,
    description: "Show the currently playing song and send it per DM to you.",
    category: "Music",
    guildOnly: true,
    deferReply: "ephemeral",
    testOnly: false,
};

export default {
    ...config,
    callback: async ({
                         client,
                         message,
                         channel,
                         interaction,
                     }: { client: BahamutClient, message: Discord.Message, channel: Discord.TextChannel, interaction: Discord.CommandInteraction }) => {
        const settings = await getGuildSettings(client, channel.guild);
        // Abort if module is disabled
        if (settings.disabled_categories.includes("music")) return;

        const checks = new BahamutCommandPreChecker(client, { client, message, channel, interaction }, config, [
            { type: PreCheckType.MUSIC_NODES_AVAILABLE },
        ]);
        if (await checks.runChecks()) return;

        const player = client.bahamut.musicHandler.manager.create({
            guild: channel.guild.id,
            textChannel: channel.id,
        });

        const musicPlayingCheck = new BahamutCommandPreChecker(client, { client, message, channel, interaction }, config, [
            { type: PreCheckType.MUSIC_IS_PLAYING, player: player },
        ]);
        if (await musicPlayingCheck.runChecks()) return;

        if ([...client.bahamut.runningGames.entries()].filter(([key, val]) => key === channel.guild.id && val.type === "musicquiz").length > 0) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "There is a running music quiz on this server. Please finish it.");

        const track = player.queue.current,
            running_time = formatDuration(player.position);

        if (!track) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "Error fetching playing song! Please try again later.");

        const full_time = formatDuration(track.duration!);

        const song = {
            website_url: undefined,
            tracklist: undefined,
            ...track,
        } as ExtendedTrack;

        if (song.isStream && (player.get("radio_station") !== null)) {
            for (const [, val] of Object.entries(client.bahamut.musicHandler.radioStations)) {
                if (val.name.toLowerCase() === player.get("radio_station")) {
                    song.website_url = val.website_url;
                    song.tracklist = val.tracklist;
                    song.title = val.name;

                    break;
                }
            }

            const res: Discord.EmbedBuilder = await new Promise((resolve, reject) => {
                radio.getStationInfo(song.uri, async (err: Error, stat: { title: string }) => {
                    if (err) reject(false);
                    let embed = new Discord.EmbedBuilder()
                        .setTitle(`${emoji.get("radio")} Now playing (Radio)`)
                        .setThumbnail(song.thumbnail)
                        .setDescription(`**[${(stat.title ? stat.title : song.title)}](${(stat.title ? `https://www.youtube.com/results?search_query=${encodeYoutubeURL(stat.title)}` : "")})**${song.website_url ? `\n\nStation:\n[${song.title}](${song.website_url})` : ""}${song.tracklist ? `\n\nPlaylist:\n${song.tracklist}` : ""}`)
                        .setFields(
                            {
                                name: "Requester",
                                value: `${typeof song.requester === "undefined" ? `${emoji.get("control_knobs")} Autoplay` : song.requester}`,
                                inline: false,
                            },
                            { name: "Playtime", value: "`???/???`", inline: false }
                        );

                    // Add status fields
                    embed = await client.bahamut.musicHandler.musicStatus(player, embed);

                    resolve(embed);
                }, radio.StreamSource.STREAM);
            });

            if (!res) return handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "Error while fetching now playing data. Please try again later.");

            handleResponseToMessage(client, message || interaction, false, config.deferReply, { embeds: [res] }, undefined, true).then(async () => {
                await handleSuccessResponseToMessage(client, message || interaction, false, config.deferReply, "Message sent!");
            }).catch(async () => {
                await handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "Error sending private message.\n\nPlease check if you allow users of this server to send private messages to you.");
            });
            return;
        } else {
            let embed = new Discord.EmbedBuilder()
                .setTitle(`${emoji.get("notes")} Now playing`)
                .setThumbnail(song.thumbnail)
                .setDescription(`**[${song.title}](${song.uri})**`)
                .setFields(
                    {
                        name: "Requester",
                        value: `${typeof song.requester === "undefined" ? `${emoji.get("control_knobs")} Autoplay` : song.requester}`,
                        inline: false,
                    },
                    { name: "Playtime", value: `\`${running_time ? running_time : "00:00"}/${full_time}\``, inline: false }
                )
                .setFooter({ text: `Use "${settings.prefix}lyrics" to see the lyrics of this song!` });

            // Add status fields
            embed = await client.bahamut.musicHandler.musicStatus(player, embed);

            handleResponseToMessage(client, message || interaction, false, config.deferReply, { embeds: [embed] }, undefined, true).then(async () => {
                await handleSuccessResponseToMessage(client, message || interaction, false, config.deferReply, "Message sent!");
            }).catch(async () => {
                await handleErrorResponseToMessage(client, message || interaction, false, config.deferReply, "Error sending private message.\n\nPlease check if you allow users of this server to send private messages to you.");
            });
            return;
        }
    },
};