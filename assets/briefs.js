/* What each add-on asks for after payment, and what happens next.
   Edit freely: field ids are stored with each member's answers. */
window.ADDON_BRIEFS = {
  addon_catalysts: { promise: "Within a week we buy and use it like real first customers. Within two weeks you get a candid written report on what to fix first, and we share you with our audience, clearly disclosed.",
    fields: [
      { id: "buy_link", label: "Link to buy from you", type: "url", required: true, placeholder: "https://" },
      { id: "share_where", label: "Where should we share you?", placeholder: "Instagram, X, LinkedIn, local groups..." },
      { id: "notes", label: "Anything we should know first?", type: "textarea" } ] },
  addon_brand: { promise: "Within three business days: name and domain check, plus two or three directions for your look. One round of changes, then your files within a week of your pick.",
    fields: [
      { id: "love", label: "Three businesses whose look you love", type: "textarea", required: true, placeholder: "Names or links, and what you like about each" },
      { id: "dislike", label: "One you don't, and why" },
      { id: "names", label: "Name ideas, if you have any" },
      { id: "colors", label: "Colors or styles to use or avoid" } ] },
  addon_crew_monthly: { promise: "I'll reply within two business days to set your first office hours.",
    fields: [
      { id: "times", label: "Best days and times for a monthly call", required: true },
      { id: "topics", label: "What you want to cover first", type: "textarea" } ] },
  addon_mapping: { promise: "Within a week: your plan as a spreadsheet you can change, plus a walkthrough call.",
    fields: [
      { id: "budget", label: "Rough startup budget", placeholder: "$" },
      { id: "numbers", label: "Prices, quotes, or costs you already have", type: "textarea" },
      { id: "goal", label: "What should year one look like?", type: "textarea", required: true } ] },
  addon_benchmarks_deposit: { promise: "I'll reply within two business days to book your kickoff. We agree the target, timeline, and full price in writing.",
    fields: [
      { id: "target", label: "Your target number", required: true, placeholder: "e.g. first 100 units sold" },
      { id: "by_when", label: "By when?" },
      { id: "now", label: "Where you are today", type: "textarea" } ] },
  build_customization: { promise: "I'll reply within two business days to book your kickoff.",
    fields: [ { id: "changes", label: "What would you change about your setup if you could change anything?", type: "textarea", required: true } ] },
  build_website_deposit: { promise: "I'll reply within two business days to book your kickoff. First version within two weeks of kickoff.",
    fields: [
      { id: "likes", label: "Sites you like", type: "textarea", required: true },
      { id: "domain", label: "Your domain, and where it's registered" },
      { id: "must", label: "Must-haves (booking, checkout, email signup...)", type: "textarea" } ] },
  build_webapp_deposit: { promise: "I'll reply within two business days to book your kickoff. Scope, timeline, and price in writing before any code.",
    fields: [
      { id: "users", label: "Who uses it, and what do they do in it?", type: "textarea", required: true },
      { id: "examples", label: "Apps that work like what you want" } ] },
  build_mobile_deposit: { promise: "I'll reply within two business days to book your kickoff. Scope, timeline, and price in writing first.",
    fields: [
      { id: "users", label: "Who uses it, and what do they do in it?", type: "textarea", required: true },
      { id: "examples", label: "Apps that work like what you want" } ] },
  build_agent_deposit: { promise: "I'll reply within two business days to book your kickoff.",
    fields: [
      { id: "job", label: "What should the agent do?", type: "textarea", required: true },
      { id: "examples", label: "Real examples: messages, quotes, or questions it should handle", type: "textarea" },
      { id: "tools", label: "Tools it should connect to" } ] },
  studio_discovery: { promise: "I'll reply within two business days to book your kickoff.",
    fields: [
      { id: "problem", label: "The problem, in a paragraph", type: "textarea", required: true },
      { id: "reading", label: "Anything I should read first (links)" } ] },
  studio_retainer_monthly: { promise: "I reply within one business day.",
    fields: [ { id: "first", label: "Your first request", type: "textarea", required: true } ] },
};
