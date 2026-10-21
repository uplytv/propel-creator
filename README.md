# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)


## Creator pricing preview (October 2026)

Free: $0/month and 3% UPLY sale fee. Pro: $99/month or $990/year and 0% UPLY fee.
Studio: $249/month or $2,490/year and 0% UPLY fee. Stripe processing is extra.
Annual billing gives two months free. UPLY Build is included only with annual Studio.

No site or functions deployed, Stripe prices created, or production data modified for this update.
PLAN_BASED_FEES_ENABLED defaults false. Do not enable it before applying the pending additive SQL
in docs/creator-pricing-migration-pending.sql and validating verified new-plan synchronization.
Price placeholders are in .env.example. VITE_CREATOR_PRICING_CHECKOUT_ENABLED defaults false
so preview signup cannot accidentally reach legacy-priced checkout.

Legacy billing identifiers are not rewritten. Existing subscribers keep their billing; display-only
labels describe plan equivalents without granting new zero-fee eligibility.
Official competitor inputs and sources: src/components/pricing/competitorPricing.ts.
Skool and Whop bundle processing into their payment rates, so the calculator does not invent
processing-excluded totals for them.
