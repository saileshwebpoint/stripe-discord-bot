import { SlashCommandRunFunction } from "../handlers/commands";
import { replyEmbed } from "../util";

export const commands = [
  {
    name: "ping",
    description: "Get the bot's latency",
  },
];

export const run: SlashCommandRunFunction = async (interaction) => {
  return interaction.reply({
    ephemeral: true,
    embeds: replyEmbed(
      `🏓 Pong! My latency is currently \`${interaction.client.ws.ping}ms\`.`
    ).embeds,
  });
};
