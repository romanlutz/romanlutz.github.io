---
title: Lutz's Law
template: law.html
description: Lutz's two laws of pull request review, coined in October 2021, plus the company-internal reversal and how AI-assisted review changes the picture today.
---

<section class="law-panel law-width" aria-labelledby="lutzs-second-law">
  <h2 id="lutzs-second-law">Lutz&rsquo;s Second Law<span>.</span></h2>
  <div class="law-opening">
    <div class="law-premise">
      <p class="law-deck">Less waiting, even in sequence.</p>
      <blockquote class="law-statement">
        <p>One large pull request can take far longer to land than a series of smaller ones, even when the smaller changes add up to more code.</p>
      </blockquote>
      <p class="law-context">The first law is about whether a change lands. The second is about how long it takes to get there.</p>
      <p class="law-context">Every extra idea in a pull request gives a reviewer more to understand, more interactions to consider, and more reasons to ask for another revision. Smaller, coherent changes let the team make progress without first agreeing on everything.</p>
      <p class="law-context">These are rules of thumb born of open-source experience, not measured probabilities or guarantees. Some changes really do belong together. The point is to make the unit of review understandable.</p>
    </div>
    <figure class="law-time" aria-labelledby="law-time-title" aria-describedby="law-time-caption">
      <h3 id="law-time-title">One long review. Three smaller ones.</h3>
      <div class="law-time-lane">
        <p class="law-time-label">One large pull request</p>
        <div class="law-time-track">
          <div class="law-time-run">
            <span class="law-time-bar">Review + rework</span>
            <span class="law-time-end">Merged <span aria-hidden="true">&#10003;</span></span>
          </div>
        </div>
      </div>
      <div class="law-time-lane">
        <p class="law-time-label">Several smaller pull requests</p>
        <div class="law-time-track">
          <div class="law-time-run law-time-run--small">
            <span class="law-time-bar">PR 1</span>
            <span class="law-time-bar">PR 2</span>
            <span class="law-time-bar">PR 3</span>
            <span class="law-time-end">Merged <span aria-hidden="true">&#10003;</span></span>
          </div>
        </div>
      </div>
      <div class="law-time-axis" aria-hidden="true"><span>Cumulative time to merge</span><span>&rarr;</span></div>
      <figcaption id="law-time-caption">The smaller PRs are reviewed and merged one after another, not in parallel. Together, they can land sooner even when they add up to more code. Bar lengths are illustrative, not measured timings.</figcaption>
    </figure>
  </div>
</section>

<section class="law-panel law-width" aria-labelledby="where-the-laws-bend">
  <h2 id="where-the-laws-bend">The internal reversal<span>.</span></h2>
  <div class="law-opening">
    <div class="law-premise">
      <p class="law-deck">Sometimes, the biggest PR gets the least review.</p>
      <blockquote class="law-statement">
        <p>Inside a company, I've also seen the opposite pattern: the larger a PR gets, the less likely it is to receive a proper review, and the more likely it is to be rubber-stamped.</p>
      </blockquote>
      <p class="law-context">In that setting, one enormous PR can merge much faster than the same work split across several smaller ones. Each small PR gets real scrutiny; the giant one gets an approval.</p>
      <p class="law-context">That is not an argument for enormous PRs. It is a warning about review quality: <strong>a fast merge is not the same as a proper review.</strong></p>
      <p class="law-byline">Present-day commentary &middot; Updated <time datetime="2026-11-06">November 6, 2026</time>. These reflections are separate from the original 2021 posts.</p>
    </div>
    <figure class="law-time law-time--reversed" aria-labelledby="law-reversal-title" aria-describedby="law-reversal-caption">
      <h3 id="law-reversal-title">Faster approval. Less scrutiny.</h3>
      <div class="law-time-lane">
        <p class="law-time-label">One large PR, rubber-stamped</p>
        <div class="law-time-track">
          <div class="law-time-run law-time-run--rushed">
            <span class="law-time-bar">Approval</span>
            <span class="law-time-end">Merged <span aria-hidden="true">&#10003;</span></span>
          </div>
        </div>
      </div>
      <div class="law-time-lane">
        <p class="law-time-label">Smaller PRs, each properly reviewed</p>
        <div class="law-time-track">
          <div class="law-time-run law-time-run--small">
            <span class="law-time-bar">PR 1</span>
            <span class="law-time-bar">PR 2</span>
            <span class="law-time-bar">PR 3</span>
            <span class="law-time-end">Merged <span aria-hidden="true">&#10003;</span></span>
          </div>
        </div>
      </div>
      <div class="law-time-axis" aria-hidden="true"><span>Cumulative time to merge</span><span>&rarr;</span></div>
      <figcaption id="law-reversal-caption">The large PR lands sooner because it gets less scrutiny, not because it is easier to review. The smaller PRs receive proper review one after another. Bar lengths are illustrative, not measured timings.</figcaption>
    </figure>
  </div>
</section>

<section class="law-panel law-width" aria-labelledby="ai-changes-the-bottleneck">
  <h2 id="ai-changes-the-bottleneck">AI changes the bottleneck<span>.</span></h2>
  <div class="law-opening">
    <div class="law-premise">
      <p class="law-deck">More review capacity. Still a need for judgment.</p>
      <p class="law-statement">With AI doing much of the review work, the original laws apply less strongly. Large PRs can now receive detailed automated review rather than simply overwhelming the available human attention. Size alone becomes a less reliable predictor of whether a PR will merge or how long that will take.</p>
      <p class="law-context">That does not make every large PR a good idea. Reviewers may still push back, for good reason. Scope, architectural context, and whether the whole change can be understood and safely landed still matter.</p>
    </div>
    <figure class="law-sketch" aria-labelledby="law-ai-title" aria-describedby="law-ai-caption">
      <h3 id="law-ai-title">AI review + human judgment.</h3>
      <svg viewBox="0 0 480 260" aria-hidden="true" focusable="false">
        <path class="law-sketch-accent" d="M120 142H176M304 142H360"/>
        <path d="M176 40H268L304 76V212H176ZM268 40V76H304"/>
        <path d="M196 96H276M196 114H258M196 132H270M196 150H240M196 168H232"/>
        <rect x="24" y="110" width="96" height="64" rx="14"/>
        <path d="M72 110V90M14 132V152M130 132V152M52 156H92"/>
        <circle cx="72" cy="84" r="6"/>
        <circle class="law-sketch-accent" cx="48" cy="134" r="4"/>
        <circle class="law-sketch-accent" cx="96" cy="134" r="4"/>
        <path d="M360 142Q408 94 456 142Q408 190 360 142Z"/>
        <circle class="law-sketch-accent" cx="408" cy="142" r="13"/>
        <circle class="law-sketch-accent" cx="270" cy="185" r="26"/>
        <path class="law-sketch-accent" d="m289 204 22 22M256 185H284M270 171V199"/>
      </svg>
      <div class="law-sketch-labels"><span>AI review</span><span>The change</span><span>Human judgment</span></div>
      <figcaption id="law-ai-caption">AI can give a large PR detailed review; people still judge scope, architecture, and whether the change should land.</figcaption>
    </figure>
  </div>
</section>

<section class="law-panel law-width" aria-labelledby="put-it-into-practice">
  <h2 id="put-it-into-practice">Put it into practice<span>.</span></h2>
  <div class="law-opening">
    <div class="law-premise">
      <p class="law-deck">Small enough to understand. Complete enough to merge.</p>
      <p class="law-statement"><strong>Split by idea, not by file count.</strong> Each change should tell one reviewable story. A small PR that cannot be understood without three unmerged siblings has not necessarily made the review smaller.</p>
      <p class="law-context"><strong>Keep the tests with the behavior.</strong> Smaller changes still need to be correct, useful, and safe to merge. Moving their tests into a later PR is not the shortcut.</p>
      <p class="law-context"><strong>Find the piece that unblocks someone else.</strong> A self-contained foundation can land while the rest of the feature is still being worked out.</p>
    </div>
    <figure class="law-sketch" aria-labelledby="law-practice-title" aria-describedby="law-practice-caption">
      <h3 id="law-practice-title">One idea and its tests, at each step.</h3>
      <svg viewBox="0 0 480 300" aria-hidden="true" focusable="false">
        <defs>
          <g id="law-practice-page">
            <path d="M0 0H66L88 22V132H0ZM66 0V22H88"/>
            <path d="M16 40H68M16 56H58"/>
            <rect x="16" y="80" width="28" height="28" rx="4"/>
            <path class="law-sketch-accent" d="m23 94 5 5 10-12M54 88H72M54 100H66"/>
          </g>
        </defs>
        <path class="law-sketch-accent" d="M16 276H168V236H332V196H464"/>
        <path d="M80 236V276M240 196V236M400 156V196"/>
        <use href="#law-practice-page" x="36" y="104"/>
        <use href="#law-practice-page" x="196" y="64"/>
        <use href="#law-practice-page" x="356" y="24"/>
        <circle class="law-sketch-node" cx="80" cy="276" r="9"/>
        <circle class="law-sketch-node" cx="240" cy="236" r="9"/>
        <circle class="law-sketch-node" cx="400" cy="196" r="9"/>
        <path class="law-sketch-accent" d="m76 276 3 3 5-6m152-37 3 3 5-6m152-37 3 3 5-6"/>
      </svg>
      <div class="law-sketch-labels"><span>PR 1 + tests</span><span>PR 2 + tests</span><span>PR 3 + tests</span></div>
      <figcaption id="law-practice-caption">Each small PR carries its own tests. Land the foundation first so someone else can build on it.</figcaption>
    </figure>
  </div>
</section>

## The receipts

[Read the original October 21, 2021 tweet thread.](https://x.com/romanlutz13/status/1451289545627086849)

---

For the broader habit behind the law, read [Ship in small, frequent slices in the field guide](junior-engineer-guide.md#part-2-go-from-reliable-to-remarkable).
