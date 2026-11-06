---
title: A Field Guide for New Engineers
template: guide.html
description: A practical, encouraging guide to earning trust, growing your impact, working with your manager, and investing in your engineering career.
subtitle: Growing from "gets tasks done" to "someone the team can't imagine working without"
---

Welcome. If you're early in your engineering career, this guide is for you. It gathers some of the most useful, hard-won lessons about growing as an engineer and frames them in a warm, encouraging way, with real substance and none of the sting.

A promise up front: **being new is not a weakness.** Every senior engineer on your team was once exactly where you are. Nobody expects you to be fast or flawless yet. What follows isn't a list of ways you're falling short. It's a map of where the road leads, and a few shortcuts to help you enjoy the trip.

---

### The one idea that changes everything

Here's something that surprises most new engineers: **your team didn't hire you for the tasks you'll finish this quarter.**

If today's raw output were all that mattered, a senior engineer could clear your task list faster than it takes to explain it to you. That's not a knock on you; it's just experience. And here's the corollary that matters most: **senior-engineer and engineering-manager time is the scarcest, most expensive resource on the team.** Every review they run, every question they field, every fire they put out for you spends down that limited budget, so how you use it (or waste it) shapes their read on you more than almost anything else. You were hired because there is far more valuable work ahead than the current team could ever finish, and the company is betting on the engineer you're *becoming.* Think of your salary as an investment in your growth, not a payment per ticket closed.

That reframes the whole game. The real question isn't *"How many things did I finish?"* It's *"How much better am I getting, and how much am I helping the people around me?"* Kent Beck describes this as the [*first derivative* of your productivity](https://newsletter.kentbeck.com/p/hey-n00b-we-didnt-hire-you-to-complete): not your output today, but how quickly it is improving.

So don't judge your progress by output counts alone, whether that's tickets closed, pull requests merged, or lines of code written. Metrics can provide useful context, but no single number captures your work's quality, impact, or what you're learning. Focus on **growth** and **trust**. The rest of this guide shows you how.

---

## Part 1: Become someone people can rely on

Before anything fancy, earn a reputation as dependable. This is the foundation everything else stands on, and it's very achievable. None of it requires genius, just care and honesty.

**1. Deliver working code with solid tests.** Run it and test the edges, not just the happy path. "It compiles" isn't the same as "it works." Tests are part of what "done" means: they catch mistakes, document intended behavior, and let others change the code confidently.

**2. Keep people informed, especially when plans change.** Tell your teammates what you're working on, where you're stuck, and when your plan changes. Aim to finish in a reasonable time. Estimates are hard, especially early on; as a rough guide, try to land within about three times your first estimate, but flag a likely delay as soon as you see it. Don't wait for the deadline to explain why it slipped.

**3. Respect people's time, including as a reviewer.** Ask for help when you need it, but avoid creating unnecessary cleanup for others: sloppy changes for reviewers, preventable alerts for on-call engineers, or incidents for ops. Double-check your work before shipping. When reviewing someone else's code, be prompt, kind, and constructive. You don't need seniority to give a useful review, and timely feedback keeps others moving.

**4. Be scrupulously honest about your progress.** This is the one that matters most. If something isn't done, say it isn't done. Never round "almost" up to "finished," and never claim work you haven't actually done. Trust is the single most valuable thing you own at work. It takes months to build and one exaggeration to dent. Being honest about setbacks *builds* trust; overstating quietly destroys it.

**5. Learn from each stumble.** Everyone makes mistakes, especially early on. That's part of learning, not a mark against you. The goal isn't to be perfect; it's to try not to trip over the *same* thing twice. Owning a mistake gracefully impresses people far more than never making one.

**6. Debug methodically, then ask a clear question.** Read the whole error, reproduce the problem, and narrow it down by changing one thing at a time and checking your assumptions. Being stuck is normal; staying stuck in silence isn't. As a rule of thumb, try on your own for about 15–30 minutes, jot down what you've tried, and then ask. Include what you're trying to do, what you expected, what actually happened (with the exact error), and what you've ruled out. A well-prepared question makes it easier to help and respects scarce senior-engineer time.

**7. Learn to spot a rabbit hole and climb out to reevaluate.** Good judgment includes noticing when you've gone deeper into a problem than it's worth. It's easy to keep digging because the fix feels one more try away. Set a checkpoint before you start: a timebox or a condition that means it's time to pause. At that point, ask: is this still the most important thing? Is there a simpler path, a workaround, or someone who knows a shortcut? Stepping back isn't quitting; it's protecting your time and everyone else's. Learning when to stop digging and reconsider the goal is a skill that can take years to build.

Nail these seven and you're already a teammate people are glad to have: dependable, low-drama, and easy to trust. That reliability is the foundation everything else is built on. Once it's consistently, unremarkably solid, you're ready to go beyond dependable and start to stand out, which is what the next part is about.

---

## Part 2: Go from reliable to remarkable

**First, a hard prerequisite: get Part 1 to top-notch before you spend real energy here.** The next-level moves below are worthless (counterproductive, even) if your fundamentals are shaky. Flashy side-quests built on unreliable, poorly-communicated, or dishonest work impress no one; they just burn the scarce senior-engineer and manager time it takes to clean up after you, and they cement the very impression you're trying to shed. There's no credit for the advanced stuff until the basics are consistently, boringly solid. Nail those first; *then* everything below makes you shine.

Once people trust your work, you grow into a standout engineer not by closing tickets faster, but by **learning more from each piece of work and lifting the people around you.** Here are ways to do that. You won't do all of them on every task; pick what fits.

**Question the task itself.** Sometimes the most valuable thing you can discover is that a task doesn't need to be done at all, or not the way it was written. Bring that case respectfully, with evidence.

**Read the code and the *why* before you change it.** Before diving in, read the surrounding code, its history, and how it's used, and ask *why does this exist, and who is it for?* Understanding the context stops you from *fixing* something that was deliberate, and helps you find the change that actually fits. When the reason isn't written down anywhere, that's a great thing to ask about, and a great thing to document once you've learned it.

**Find the 10% that delivers 90%, and know when to stop there.** Dig into the data or the real user need and figure out which small part of the work creates most of the value. Doing the vital slice well often beats doing the whole thing mechanically. This runs against a common early-career instinct: solving every problem in the most general, fully-automated, handles-every-edge-case way. Resist it. If covering the last 10% of cases would double or triple the complexity of your solution, it's usually smarter to handle the common 90% cleanly and leave a rare edge case as a documented manual step or a follow-up ticket. A simple solution that covers the majority (with a clear note on what it deliberately skips) almost always beats a sprawling one that technically handles everything but is hard to read, test, and maintain. Knowing *what not to build* is itself a senior skill; showing it early gets noticed.

**Favor simple, boring code over clever code.** Code gets read far more often than it gets written, so optimize for the next person, often future you. A clear, slightly longer solution beats a clever one-liner nobody can follow, and a little honest duplication is usually cheaper than the wrong abstraction. Reach for cleverness only when the simple version genuinely can't do the job.

**Try more than one approach.** Implementing something two or three ways, even as quick sketches, teaches you the trade-offs and usually leads to a better final design than committing to your first idea.

**Leave the code a little better than you found it.** As you work, you'll notice nearby messiness. Where it's reasonable, tidy it. A helpful mantra: *make the hard change easy (that part may itself be hard), then make the easy change.*

**Ship in small, frequent slices, and make each one easy to say yes to.** A series of small, understandable changes is far easier to review and far safer than one giant diff at the end. Pushing a little every day keeps momentum visible and problems small. Help your reviewer, too: write a short description of *what* changed and *why* (and how to test it), and keep your commit messages clean. The easier your change is to review, the faster it lands, and the less of that scarce senior time it costs.

**Build the tool that helps everyone.** If a task is tedious, it's probably tedious for others too. A small script, template, or bit of automation that removes that friction can help the whole team. (Just make sure the pain is real and recurring first.)

**Help beyond your own corner.** Once your own work is on track, a useful fix or review in another team's area shows range and generosity, but never at the expense of your own commitments.

**Write up what you learned.** When you figure something out (a gnarly bug, a system's quirks, a better pattern), write it down and share it clearly. Teaching others multiplies your impact and cements your own understanding.

**A word on time.** All of this takes a little longer than doing the bare minimum, so don't over-polish, and don't chase shiny detours forever. Get the task done in a reasonable window, then invest the time you *save* (as you get faster) into these growth activities. Growth that also helps others is exactly what a great career is built from.

---

## Part 3: Build a genuinely good relationship with your manager

Your manager has more influence over your day-to-day happiness and your career than almost anyone. Investing in that relationship means building trust, communicating clearly, and helping each other succeed. The five habits below are high-leverage: small effort, outsized payoff.

A gentle bit of honesty first: managers *do* form impressions of where each person is headed, and those impressions tend to shift in sudden jumps rather than slow drift. The good news is that you have real influence over that story. Here's how.

**1. Ask for feedback, then be seen acting on it.** Most people nod at feedback and change nothing, so managers half-expect to repeat themselves forever. Simply asking *"What's one thing I could do better?"* and then visibly doing something about it the next week is genuinely striking, in the best way. Show the change; don't just promise it.

**2. Give proactive status updates.** To a manager, chasing people for basic information is exhausting. Be the person who shares it *before* being asked: what you finished, what you're on now, what's blocking you, and how you plan to handle it. A nice self-test: every time your manager has to ask "where are things at?", treat it as a small miss. And when you raise a problem, come with a suggested next step, not just the problem.

**3. Surface problems early, with options.** Managers hate surprises, especially late ones. *Bad news delivered early is just news; delivered late, it's a crisis.* When you spot trouble, a great message has four parts: (1) the problem and how you noticed it, (2) its likely impact, (3) a couple of options, and (4) your recommendation. Sending that early marks you as someone who can be trusted to handle things.

**4. Anticipate needs and quietly remove friction.** Notice the recurring annoyances everyone has silently accepted (the flaky setup step, the confusing doc, the manual chore) and fix one without being asked. Then share the fix casually, as if it's the most natural thing in the world (and make sure your manager sees it). Ownership like this stands out precisely because so few people show it.

**5. Understand what your manager is measured on, and help.** Your manager has a boss, goals, and metrics of their own. Ask them: *"What's one thing you're being measured on right now?"* Then look for ways your work can support that priority. Helping your manager succeed in front of *their* boss is one of the most powerful and genuinely kind things you can do. Their wins tend to become your opportunities.

---

## Part 4: Take the long view and invest in yourself

The work above earns trust and impact. This last part is about keeping *you* growing and healthy across a whole career, not just this quarter.

**Keep a work log (a *brag document*).** Once a week, jot down what you did, what you learned, and anything you're proud of. It takes minutes and pays off everywhere: it makes your status updates and one-on-ones effortless, it powers your self-reviews when promotion time comes, and it quietly fights the recency bias that makes everyone, including you, forget what you accomplished six months ago.

**Optimize your early years for learning.** Compounding matters more than a slightly bigger paycheck right now. Where you can, choose the team and problems that will teach you the most, and try to be in rooms where you're *not* the smartest person; that's where you grow fastest.

**Build relationships beyond your manager.** Your manager matters, but so do your peers, your reviewers, and mentors across the org. Be generous, curious, and easy to work with; the trust you build sideways and downward is worth as much as the trust you build upward.

**Be kind to yourself.** Confusion is normal. Every senior engineer was lost once too, and still is regularly. *I don't know, let me find out* is a strong, trust-building answer, not a weak one. You don't have to prove yourself in a week: aim for steady growth, rest when you need it, and give yourself the same patience you'd offer a teammate.

---

## How to actually start

Please don't try to do all of this at once. That's a recipe for overwhelm, and this is a career, not a week. A gentler plan:

- **This week:** pick *one* thing. Maybe ask your manager for a piece of feedback, or send one proactive status update.
- **Notice what happens.** These small moves tend to land more strongly than you'd expect.
- **Add one more next week.** Reliability first (Part 1), then growth and relationships (Parts 2 and 3), and keep the long game in view (Part 4).

And keep the big picture in mind: your contribution is bigger than any output count. The people around you are quietly rooting for you to grow because a thriving next generation of engineers is exactly what makes *their* working lives better too. You're not being judged; you're being invested in. Enjoy the climb.

---

### One-page checklist

Check off habits as you reflect. These checkmarks are just for this visit, not saved or sent anywhere. Use **Print / save as PDF** to keep a copy.

**Be reliable**

<ul class="guide-checklist">
  <li><label><input type="checkbox"> My code works, including edge cases, and has solid tests.</label></li>
  <li><label><input type="checkbox"> I kept people informed and flagged slipping estimates early.</label></li>
  <li><label><input type="checkbox"> I respected others' time and reviewed code promptly and kindly.</label></li>
  <li><label><input type="checkbox"> I was honest about what's done and what isn't.</label></li>
  <li><label><input type="checkbox"> I learned from mistakes and took steps to avoid repeating them.</label></li>
  <li><label><input type="checkbox"> I debugged methodically and asked a clear, well-prepared question when needed.</label></li>
  <li><label><input type="checkbox"> I noticed a rabbit hole and climbed out to reevaluate.</label></li>
</ul>

**Grow & multiply**

<ul class="guide-checklist">
  <li><label><input type="checkbox"> I asked whether the task was really needed.</label></li>
  <li><label><input type="checkbox"> I found the high-value core of the work.</label></li>
  <li><label><input type="checkbox"> I shipped small, frequent changes.</label></li>
  <li><label><input type="checkbox"> I left the code a little better than I found it.</label></li>
  <li><label><input type="checkbox"> I shared something I learned.</label></li>
  <li><label><input type="checkbox"> I understood the code and the <em>why</em> before changing it.</label></li>
  <li><label><input type="checkbox"> I kept it simple and easy to review.</label></li>
</ul>

**Partner with your manager**

<ul class="guide-checklist">
  <li><label><input type="checkbox"> I asked for feedback and acted on it visibly.</label></li>
  <li><label><input type="checkbox"> I gave a status update before being asked.</label></li>
  <li><label><input type="checkbox"> I raised a risk early, with options + a recommendation.</label></li>
  <li><label><input type="checkbox"> I fixed a recurring friction point unprompted.</label></li>
  <li><label><input type="checkbox"> I know one thing my manager is measured on.</label></li>
</ul>

**Invest in yourself**

<ul class="guide-checklist">
  <li><label><input type="checkbox"> I jotted down what I did and learned this week.</label></li>
  <li><label><input type="checkbox"> I'm choosing work that helps me learn.</label></li>
  <li><label><input type="checkbox"> I invested in a relationship beyond my manager.</label></li>
  <li><label><input type="checkbox"> I was kind to myself when I got stuck.</label></li>
</ul>

---

## Sources & further reading

- Kent Beck: [*Hey n00b, we didn't hire you to complete tasks*](https://newsletter.kentbeck.com/p/hey-n00b-we-didnt-hire-you-to-complete) (Tidy First? newsletter). Blunt in places, but full of signal about what senior engineers actually notice.
- Steve Huynh: [*5 Simple Ways to Impress Your Boss*](https://alifeengineered.substack.com/p/5-simple-ways-to-impress-your-boss-dc2) (A Life Engineered).
- Julia Evans: [jvns.ca](https://jvns.ca). Practical posts on debugging, asking good questions, and keeping a brag document.
- Charity Majors: [charity.wtf](https://charity.wtf). On learning, ownership, and caring about your work after it ships.
- Will Larson: [lethain.com](https://lethain.com). On engineering growth, ownership, and career.
- Gergely Orosz: [The Pragmatic Engineer](https://blog.pragmaticengineer.com). Real-world engineering practices and career progression.
- [*Don't ask to ask, just ask*](https://dontasktoask.com). A one-page classic on asking better questions.
