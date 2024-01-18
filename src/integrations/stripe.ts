import pQueue from "p-queue";

const queue = new pQueue({ concurrency: 1, interval: 1000, intervalCap: 1 });

/**
 * Gets the Stripe customer ID for a given user email
 */
export const resolveCustomerIdFromEmail = async (email: string) => {
  let customerData;

  if (email.includes("+")) {
    const endPart = email.split("+")[1];
    const customers = await queue.add(
      async () =>
        await (
          await fetch(
            `https://api.stripe.com/v1/customers/search?query=email~'${endPart}'`,
            {
              headers: {
                Authorization: `Bearer ${process.env.STRIPE_API_KEY}`,
                "Stripe-Version": "2020-08-27",
              },
            }
          )
        ).json()
    );
    const matchingCustomers = customers.data.filter(
      (c: any) => c.email === email
    );
    customerData = matchingCustomers[0];
  } else {
    const customers = await queue.add(
      async () =>
        await (
          await fetch(
            `https://api.stripe.com/v1/customers/search?query=email:'${email}'`,
            {
              headers: {
                Authorization: `Bearer ${process.env.STRIPE_API_KEY}`,
                "Stripe-Version": "2020-08-27",
              },
            }
          )
        ).json()
    );
    console.log(customers);
    customerData = customers.data[0];
  }

  return customerData?.id;
};

/**
 * Gets all the Stripe subscriptions from a given customer ID
 */
export const findSubscriptionsFromCustomerId = async (
  oldCustomerId: string
) => {
  const subscriptions = await queue.add(
    async () =>
      await (
        await fetch(
          `https://api.stripe.com/v1/subscriptions?customer=${oldCustomerId}`,
          {
            headers: {
              Authorization: `Bearer ${process.env.STRIPE_API_KEY}`,
              "Stripe-Version": "2020-08-27",
            },
          }
        )
      ).json()
  );
  return subscriptions.data || [];
};

/**
 * Filter the active subscriptions from a list of subscriptions
 */
export const findActiveSubscriptions = (subscriptions: any[]) => {
  return subscriptions.filter(
    (sub) =>
      sub.status === "active" ||
      sub.status === "trialing" ||
      (sub.cancel_at && sub.current_period_end > Date.now() / 1000)
  );
};

const Monthly_Advanced_Individual = "price_1LxFKUH6LucJupvi3hRWTHeW";
const Monthly_Advanced_Individual_Realvision = "price_1OSYUGH6LucJupviOZfu5yxR";
const Monthly_Advanced_LFA = "price_1LxFKUH6LucJupviIjvEiFwd";
const Monthly_Advanced_LFA_Realvision = "price_1OSYSqH6LucJupvilE9ctpIV";
const Yearly_Advanced_Individual = "price_1LxFKUH6LucJupvitjmkWPfs";
const Yearly_Advanced_Individual_Realvision = "price_1OSYUlH6LucJupviPFzINW5T";
const Yearly_Advanced_LFA = "price_1LxFKUH6LucJupviFxxkVvLH";
const Yearly_Advanced_LFA_Realvision = "price_1OSYSYH6LucJupvi8yY3lcap";
const Yearly_Advanced_Institutional = "price_1LxFKUH6LucJupviCe7o5dSG";
const Yearly_Direct_Institutional = "price_1Nq7PfH6LucJupviQhKVmqEQ";
const Yearly_Direct_Institutional_Realvision = "price_1OSYetH6LucJupviZN7mSrLB";
const seekingAlphaMembership = "price_1MjLEtH6LucJupvieNsbKAmB";
const friendsAndFamilyMembership = "price_1MjLKKH6LucJupvivY03t1z6";
const ioFundMembership = "price_1MjLKhH6LucJupvikG6Bikb2";

const oldPrices = [
  "price_1Ld04rH6LucJupvizT9yPACK", // Individual Investory (Annual)
  "premium-annual-membership-499-12month", // Individual Investory (Annual) - Advanced
  "premium-membership-499-12month", // Premium Membership
  "price_1Ld05UH6LucJupvis7aEUQYR", // Individual Investor (Monthly)
  "premium-monthly-membership-65-30day", // Individual Investor (Monthly) - Advanced
  "price_1H0IyGH6LucJupviXWMp39Bt", // Price for Free Annual Membership
  "price_1JmjUrH6LucJupviaz2e3CK9", // LFA or RIA (Annual) $499
  "price_1LczyxH6LucJupviB9AcIAni", // LFA or RIA (Annual) $799
  "price_1JmjTWH6LucJupviok6FjZvy", // LFA or RIA (Monthly) $65 - Advanced
  "price_1Ld01sH6LucJupvieKal9nIk", // LFA or RIA (Monthly) $99
  "price_1JmTZkH6LucJupviLVhZEMBo", // Institutional Investor (Annual) $7500
];

const ADVANCED_PLAN_IDS = [
  Monthly_Advanced_Individual,
  Monthly_Advanced_Individual_Realvision,
  Monthly_Advanced_LFA,
  Monthly_Advanced_LFA_Realvision,
  Yearly_Advanced_Individual,
  Yearly_Advanced_Individual_Realvision,
  Yearly_Advanced_LFA,
  Yearly_Advanced_LFA_Realvision,
  Yearly_Advanced_Institutional,
  Yearly_Direct_Institutional,
  Yearly_Direct_Institutional_Realvision,
  seekingAlphaMembership,
  friendsAndFamilyMembership,
  ioFundMembership,
  ...oldPrices,
];

export const filterAdvancedSubscriber = (subscriptions: any[]) => {
  return subscriptions.some((sub) => ADVANCED_PLAN_IDS.includes(sub.plan.id));
};

/**
 * Cancels a subscription
 */
export const cancelSubscription = async (subscriptionId: string) => {
  await queue.add(
    async () =>
      await (
        await fetch(
          `https://api.stripe.com/v1/subscriptions/${subscriptionId}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${process.env.STRIPE_API_KEY}`,
              "Stripe-Version": "2020-08-27",
            },
          }
        )
      ).json()
  );
};

/**
 * Gets all the Stripe payments from a given customer ID
 */
export const getCustomerPayments = async (customerId: string) => {
  const invoices = await queue.add(
    async () =>
      await (
        await fetch(
          `https://api.stripe.com/v1/payment_intents?customer=${customerId}`,
          {
            headers: {
              Authorization: `Bearer ${process.env.STRIPE_API_KEY}`,
              "Stripe-Version": "2020-08-27",
            },
          }
        )
      ).json()
  );
  return invoices?.data || [];
};

/**
 * Gets the lifetime payment date from a list of payments
 */
export const getLifetimePaymentDate = (payments: any[]): null | number => {
  let lifetimeStartDate = null;
  for (const payment of payments || []) {
    for (const charge of payment.charges?.data || []) {
      if (
        charge.description.includes(process.env.LIFETIME_INVOICE_LABEL_KEYWORD)
      ) {
        lifetimeStartDate = charge.created * 1000;
      }
    }
  }
  return lifetimeStartDate;
};
