import Discord from "discord.js";
import { Bahamut } from "../../bahamut";
import { GuildSettings } from "../../../typings";
import { resolve } from "path";

const letterEmojisMap: { [key: string]: string } = {
    "đ°ī¸": "A", "đĻ": "A", "đąī¸": "B", "đ§": "B", "đ¨": "C", "đŠ": "D", "đĒ": "E",
    "đĢ": "F", "đŦ": "G", "đ­": "H", "âšī¸": "I", "đŽ": "I", "đ¯": "J", "đ°": "K", "đą": "L",
    "âī¸": "M", "đ˛": "M", "đŗ": "N", "đžī¸": "O", "â­": "O", "đ´": "O", "đŋī¸": "P",
    "đĩ": "P", "đļ": "Q", "đˇ": "R", "đ¸": "S", "đš": "T", "đē": "U", "đģ": "V", "đŧ": "W",
    "âī¸": "X", "â": "X", "â": "X", "đŊ": "X", "đž": "Y", "đ¤": "Z", "đŋ": "Z",
};

export default class HangmanGame {
    private _gameEmbed: Discord.Message | null;
    private _channel;
    private _bahamut;
    private _inGame;
    private _word;
    private _guessed: string[];
    private _wrongs;
    private _guildSettings: GuildSettings;
    private _member;
    private _config: { words: string[], color: string } = { words: [], color: "" };
    private _players: Discord.GuildMember[];
    private _lang;

    constructor(bahamut: Bahamut, channel: Discord.TextChannel, settings: GuildSettings, member: Discord.GuildMember) {
        this._gameEmbed = null;
        this._channel = channel;
        this._bahamut = bahamut;
        this._inGame = false;
        this._word = "";
        this._guessed = [];
        this._wrongs = 0;
        this._guildSettings = settings;
        this._member = member;
        this._players = [];

        this._config.words = require(resolve(`assets/games/hangman/words/${this._guildSettings.language}.json`));
        this._config.color = this._bahamut.config.primary_message_color;

        this._lang = require(resolve(`assets/games/hangman/langs/${this._guildSettings.language}.json`));
    }

    newGame() {
        if (this._inGame) return;

        const possible_words = this._config.words;

        this._inGame = true;
        this._word = possible_words[Math.floor(Math.random() * possible_words.length)].toUpperCase();
        this._guessed = [];
        this._wrongs = 0;

        const embed = new Discord.EmbedBuilder()
            // @ts-ignore
            .setColor(this._config.color)
            .setAuthor({ name: "Hangman", iconURL: this._bahamut.config.game_icons.hangman })
            .setDescription(this.getDescription())
            .addFields({ name: this._lang.hangman.guessed, value: "\u200b" })
            .addFields({ name: this._lang.hangman.how, value: "\u200b" });

        this._bahamut.client.bahamut.runningGames.set(this._channel.id, {
            "type": "hangman",
            "initiator": this._member,
            "obj": this,
        });

        this._channel.send({ embeds: [embed] }).then(emsg => {
            this._gameEmbed = emsg;
            this.waitForReaction();
        });
    }

    makeGuess(reaction: string, message: boolean = false) {
        if (!message) {
            if (Object.keys(letterEmojisMap).includes(reaction)) {
                const letter = letterEmojisMap[reaction];
                if (!this._guessed.includes(letter)) {
                    this._guessed.push(letter);

                    if (this._word.indexOf(letter) == -1) {
                        this._wrongs++;

                        if (this._wrongs == 6) {
                            this.gameOver(false);
                        }
                    } else if (!this._word.split("").map(l => this._guessed.includes(l) ? l : "_").includes("_")) {
                        this.gameOver(true);
                    }
                }
            }
        } else if (message && reaction.length > 0) {
            const letter = reaction[0].toUpperCase();
            if (!this._guessed.includes(letter)) {
                this._guessed.push(letter);

                if (this._word.indexOf(letter) == -1) {
                    this._wrongs++;

                    if (this._wrongs == 6) {
                        this.gameOver(false);
                    }
                } else if (!this._word.split("").map(l => this._guessed.includes(l) ? l : "_").includes("_")) {
                    this.gameOver(true);
                }
            }
        }

        if (this._inGame) {
            const editEmbed = new Discord.EmbedBuilder()
                // @ts-ignore
                .setColor(this._config.color)
                .setTitle(this._lang.hangman.title)
                .setDescription(this.getDescription())
                .addFields({
                    name: this._lang.hangman.guessed,
                    value: this._guessed.length == 0 ? "\u200b" : this._guessed.join(" "),
                })
                .addFields({ name: this._lang.hangman.how, value: "\u200b" });
            this._gameEmbed!.edit({ embeds: [editEmbed] });
            this.waitForReaction();
        }
    }

    async gameOver(win: boolean) {
        this._inGame = false;
        const editEmbed = new Discord.EmbedBuilder()
            // @ts-ignore
            .setColor(this._config.color)
            .setAuthor({
                name: this._lang.hangman.over,
                iconURL: (win ? this._bahamut.config.message_icons.success : this._bahamut.config.message_icons.error),
            })
            .setDescription((win ? this._lang.hangman.wins : this._lang.hangman.losses) + "\n\n" + this._lang.hangman.was + "\n" + this._word);
        await this._gameEmbed!.edit({ embeds: [editEmbed] });

        await this._gameEmbed!.reactions.removeAll();

        this._bahamut.runningGames.delete(this._channel.id);

        for (const id of this._players) {
            await this._bahamut.dbHandler.guildUserStat.addDBGuildUserStat(this._channel.guild, id, "games_hangman_count", 1);
        }
    }

    stopGame(win: boolean) {
        this._inGame = false;
        const editEmbed = new Discord.EmbedBuilder()
            // @ts-ignore
            .setColor(this._config.color)
            .setAuthor({
                name: this._lang.hangman.over,
                iconURL: (win ? this._bahamut.config.message_icons.success : this._bahamut.config.message_icons.error),
            })
            .setDescription(this._lang.hangman.stopped);
        this._gameEmbed!.edit({ embeds: [editEmbed] });

        this._gameEmbed!.reactions.removeAll();

        this._bahamut.runningGames.delete(this._channel.id);
    }

    getDescription() {
        return "```"
            + "|âžâžâžâžâžâž|   \n|     "
            + (this._wrongs > 0 ? "đŠ" : " ")
            + "   \n|     "
            + (this._wrongs > 1 ? "đ" : " ")
            + "   \n|     "
            + (this._wrongs > 2 ? "đ" : " ")
            + "   \n|     "
            + (this._wrongs > 3 ? "đŠŗ" : " ")
            + "   \n|    "
            + (this._wrongs > 4 ? "đđ" : " ")
            + "   \n|     \n|__________\n\n"
            + this._word.split("").map(l => this._guessed.includes(l) ? l : "_").join(" ")
            + "```";
    }

    waitForReaction() {
        const filterMessage = (msg: Discord.Message) => !msg.author.bot;

        this._gameEmbed!.awaitReactions({ max: 1, time: 300000, errors: ["time"] })
            .then(async (collected: Discord.Collection<Discord.Snowflake | string, Discord.MessageReaction>) => {
                const reaction = collected.first();
                if (!reaction || !reaction.users.cache.first()) return;

                // @ts-ignore
                if (!this._players.includes(reaction.users.cache.first())) this._players.push(reaction.users.cache.first());

                this.makeGuess(reaction.emoji.name || "");
                await reaction.remove();
            })
            .catch(async () => {
                await this.gameOver(false);
            });
        this._gameEmbed!.channel.awaitMessages({ filter: filterMessage, max: 1, time: 300000, errors: ["time"] })
            .then(async (collected: Discord.Collection<Discord.Snowflake, Discord.Message>) => {
                const selected = collected.first()!;
                if (!selected || !selected.member) return;

                // @ts-ignore
                if (!this._players.includes(selected.member)) this._players.push(selected.member);

                this.makeGuess(selected.content, true);
                await collected.first()!.delete();
            })
            .catch(async () => {
                await this.gameOver(false);
            });
    }
}