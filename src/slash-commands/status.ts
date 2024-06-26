import { SlashCommandRunFunction } from "../handlers/commands";
import { errorEmbed, successEmbed } from "../util";
import { Postgres, DiscordCustomer } from "../database";
import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import {
  filterAdvancedSubscriber,
  findActiveSubscriptions,
  findSubscriptionsFromCustomerId,
  getCustomerPayments,
  getLifetimePaymentDate,
  resolveCustomerIdFromEmail,
} from "../integrations/stripe";
import { client } from "..";

export const commands = [
  {
    name: "status",
    description: "Get your exclusive access status!",
    options: [
      {
        name: "user",
        description: "The user you want to get the status of",
        type: ApplicationCommandOptionType.User,
        required: false,
      },
    ],
  },
];

export const run: SlashCommandRunFunction = async (interaction) => {
  if (interaction.channelId !== process.env.STATUS_CHANNEL_ID) {
    return void interaction.reply({
      content: `This command can only be used in <#${process.env.STATUS_CHANNEL_ID}>. Please go there and try again.`,
      ephemeral: true,
    });
  }

  const user = interaction.options.getUser("user") || interaction.user;

  const discordCustomer = await Postgres.getRepository(DiscordCustomer).findOne(
    {
      where: {
        discordUserId: user.id,
      },
    }
  );

  if (!discordCustomer) {
    return void interaction.reply({
      ephemeral: true,
      embeds: errorEmbed(`There is no email linked to your account!`).embeds,
    });
  }

  const customerId = await resolveCustomerIdFromEmail(discordCustomer.email);

  const subscriptions = await findSubscriptionsFromCustomerId(customerId);
  const isAdvancedSubscriber = filterAdvancedSubscriber(subscriptions);

  if (!isAdvancedSubscriber) {
    // remove role of IO Member here
    // const guild = client.guilds.cache.get(process.env.GUILD_ID!)!;
    // await guild.members.fetch();
    // const member = guild.members.cache.get(user.id);
    // console.log("Member: ", member);
    // member?.roles.remove(process.env.PAYING_ROLE_ID!);
    console.log(
      discordCustomer.email,
      " has no access, customerId",
      customerId
    );
    return void interaction.reply({
      ephemeral: true,
      embeds: errorEmbed(`This account does not have advanced access!`).embeds,
    });
  }

  // const payments = await getCustomerPayments(customerId);
  // const lifetimePaymentDate = await getLifetimePaymentDate(payments);
  console.log(discordCustomer.email, " has access, customerId", customerId);

  const embed = new EmbedBuilder()
    .setAuthor({
      name: `${user.tag}'s access`,
      iconURL: user.displayAvatarURL(),
    })
    .setDescription(
      `Here are all the ${process.env.SUBSCRIPTION_NAME} subscriptions 👑`
    )
    .setColor(process.env.EMBED_COLOR)
    .addFields([
      {
        name: "Subscriptions",
        value:
          subscriptions.length > 0
            ? subscriptions
                .map((subscription: any) => {
                  let name = subscription.items.data[0]?.plan.id
                    .replace(/_/g, " ")
                    .replace(/^\w|\s\w/g, (l: string) => l.toUpperCase());
                  if (name.includes("Membership")) {
                    name = name.slice(
                      0,
                      name.indexOf("Membership") + "Membership".length
                    );
                  }
                  return `${name} (${
                    subscription.status === "active"
                      ? "✅ Active"
                      : subscription.cancel_at &&
                        subscription.current_period_end > Date.now() / 1000
                      ? "❌ Cancelled (not expired yet)"
                      : "❌ Cancelled"
                  })`;
                })
                .join("\n")
            : "There is no subscription for this account.",
      },
      /*{
                name: 'Access given by the admins',
                value: discordCustomer.adminAccessEnabled ? '✅ Access' : '❌ No access'
            }*/
    ]);

  return void interaction.reply({
    ephemeral: true,
    embeds: [embed],
  });
};
