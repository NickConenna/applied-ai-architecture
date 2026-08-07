# Applied AI Architecture

I'm Nick Conenna. I build systems where a human's context and an AI's throughput are
the same production line. This repo is the working record: the methodology, the
artifacts it produced, and the parts that failed.

Not a tutorial collection. Everything here came out of something I shipped or am
currently running.

---

## The thesis

**Context × Loops.**

Techniques are free — everyone has the same models, the same frameworks, the same
prompt libraries. What isn't free is the context you bring to the loop: what you've
lived, what you've built, what you can imagine that the model can't retrieve.

The corollary, which I've written about separately: your agent framework doesn't
matter, your verifier does. Framework choice is a two-week decision. Verification
design is what determines whether the system compounds or drifts.

---

## What's in here

### `/methodology`
The loop patterns I actually run — how a task gets decomposed, where the human
judgment call sits, what gets checked and by what.

- Context assembly: turning domain experience into something a model can act on
- Loop design: iteration boundaries, stop conditions, escape hatches
- Verifier-first agent design: writing the check before the capability

### `/case-studies`
Real systems, with the architecture and the tradeoffs.

- **YSKAIPE** — two-sided home services marketplace, built solo. Matching logic,
  supply-side onboarding, the parts that broke.
- **Agentic legal platform** — document-heavy workflow with a live contested-probate
  matter as the first case. Where retrieval helps and where it dangerously doesn't.
- **Land & water development** — AI applied to physical-world constraints: site work,
  permitting, resource planning. The domain that keeps me honest about what models
  don't know.

### `/artifacts`
Reusable pieces. Prompt structures, verifier harnesses, evaluation scaffolds.
Take what's useful.

### `/postmortems`
Things that didn't work, and why. This section is the point.

---

## Why the range

Marketplace software, legal workflow, and excavation are not adjacent fields, and
that's deliberate. The method holds across them because the method isn't about the
domain — it's about how much real context you can compress into a loop and how
rigorously you verify the output. Breadth is the evidence, not a résumé accident.

---

## Currently

Building. Open to applied-AI architecture, forward-deployed engineering, and
founding product work. Also available for contract engagements.

- LinkedIn: https://www.linkedin.com/in/nickconenna/
- Site: nickconenna.com
- Email: nano.nicholas@gmail.com

---

*MIT licensed. Use anything here.*
