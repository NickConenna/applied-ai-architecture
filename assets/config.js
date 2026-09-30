/* =========================================================
   SITE CONFIG — the one file to edit.
   Prices shown on the site come from here. Stripe links come
   from assets/links.js, which stripe/create-catalog.sh writes
   for you. Keys match the Stripe lookup keys in STRIPE-CODES.md.
   ========================================================= */
window.SITE = {
  email: "nanonicholas@protonmail.com",
  siteUrl: "https://nickconenna.com",

  /* Supabase powers sign-in, the member area, and the AI partner.
     The anon key is safe in the browser: row-level security guards the data. */
  supabaseUrl: "",       // https://YOUR-PROJECT.supabase.co
  supabaseAnonKey: "",   // Project Settings > API > anon public
  buttondown: "",   // Buttondown embed-subscribe URL
  youtube: "",      // channel URL
  booking: "",      // Cal.com / Calendly URL
  guarantee: "",    // e.g. "Core Kit not a fit? Full refund within 14 days. "
  quote: { text: "", by: "" },               // a founder's words, with permission
  videos: { publishing: "", service: "", shop: "" }, // YouTube embed URL or .mp4

  /* Everything for sale. price = full price in dollars.
     unit: "" one-time, "/mo" monthly, "from" starting price.
     deposit = what the Stripe link charges up front (balance invoiced).
     price null = quoted. group decides where it shows. */
  catalog: {
    core_kit:                { group:"core",  name:"Core Kit", price:99 },

    addon_catalysts:         { group:"grow",  name:"Catalysts", kind:"Us, in your corner", price:250,
      text:"We become your first fans and customers. We buy, review honestly, share you with our audience, and tell you what to fix." },
    addon_brand:             { group:"grow",  name:"Brand", kind:"Look the part", price:500,
      text:"Name check, logo, colors, domain, and social handles, so customers take you seriously on day one." },
    addon_crew_monthly:      { group:"grow",  name:"Crew", kind:"Ongoing support", price:199, unit:"/mo",
      text:"Monthly office hours, fixes, and upgrades as you grow. Cancel anytime." },

    addon_mapping:           { group:"plan",  name:"Mapping", kind:"The full plan", price:750,
      text:"A complete business plan on real-world baseline models: startup costs, pricing, break-even, and a first-year forecast." },
    addon_benchmarks_deposit:{ group:"plan",  name:"Benchmarks", kind:"Execution to a number", price:null, deposit:500,
      text:"Pick a target, like your first 100 units sold. We plan it, run it with you, and report every week until you hit it." },

    build_customization:     { group:"build", name:"Customization", kind:"Your vision", price:1500,
      text:"Two weeks side by side, shaping your kit around your brand, features, and way of working." },
    build_website_deposit:   { group:"build", name:"Website", kind:"Web", price:2500, deposit:1250,
      text:"A fast, custom marketing site with booking or checkout, email capture, and analytics, live on your domain." },
    build_webapp_deposit:    { group:"build", name:"Web app", kind:"Web", price:7500, unit:"from", deposit:2500,
      text:"Accounts, dashboards, payments, and your data, built as a real product your customers log into." },
    build_mobile_deposit:    { group:"build", name:"Mobile app", kind:"iOS and Android", price:12000, unit:"from", deposit:4000,
      text:"One codebase for iPhone and Android, through App Store and Google Play review to launch." },
    build_agent_deposit:     { group:"build", name:"AI agent", kind:"Automation", price:5000, unit:"from", deposit:2000,
      text:"An AI assistant wired into your tools that answers, quotes, schedules, or researches, with checks so it stays right." },

    studio_discovery:        { group:"studio", name:"Discovery", kind:"Two-week paid look", price:1500,
      text:"I learn your problem, prototype the riskiest part, and hand you a written plan and fixed quote. Credited toward the build." },
    studio_retainer_monthly: { group:"studio", name:"Studio retainer", kind:"Ongoing development", price:3000, unit:"/mo",
      text:"A standing slot of development every month: new features, fixes, and priority response. Cancel with 30 days' notice." },

    journey_deposit:         { group:"journey", name:"Journey", kind:"All in", price:null, deposit:2500, apply:true,
      text:"Every add-on, start to finish, from idea to your first benchmark and beyond. We only take on a few of these at a time." }
  }
};
