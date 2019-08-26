---
title: Software Engineering
isMarkdown: true
lastUpdate: "August 25, 2019"
---
# Software Engineering

## Data Structures
There's no way you'll get around data structures as a Software Engineer. However, some people mistake "data structures" for those obscure ones that take an hour to explain and another to find a good use case for. Various lists, hash maps, trees, hash maps, arrays, and hash maps are your daily bread and butter. Did I mention hash maps? You should know these inside out, with complexity trade-offs etc. You'll probably encounter more complex scenarios that require more specialized data structures as well. If you know your basic ones, it's usually relatively easy to understand what's required in the advanced case.

You may have noticed by now that I'm a big fan of hash maps. Apart from that I love [Union-Find data structures](https://en.wikipedia.org/wiki/Disjoint-set_data_structure). They can be used for detecting circles in graphs, among other things.

Here's a great resource on graphs: [D3 Graph Theory](https://mrpandey.github.io/d3graphTheory/index.html)

## Programming Languages
Depending on your situation, you may or may not have the luxury to take a structured approach to learning a new language. There's a few great books that introduce you to the basics and teach your programming in general. Those aren't even that hard to find. The books I list below go beyond the very basics, although they may include some important fundamentals.

- [Effective Modern C++](http://shop.oreilly.com/product/0636920033707.do) by Scott Meyers is arguably the most useful book on programming I have ever read. I studied it while learning C++ basics, and could literally see the quality of my code improving. Conversations quickly moved from "how to somehow get the job done" to "how to get the job done properly", without wasting any time. If you want to get the book, be careful, though! There's a few similarly named titles (all by Scott Meyers), from "Effective Modern C++", and "Effective C++" to "More Effective C++". The most recent version is probably the way to go.
- [Effective Java](https://www.amazon.com/Effective-Java-3rd-Joshua-Bloch/dp/0134685997) by Joshua Bloch serves a very similar purpose to Java as Effective Modern C++ to C++. I love that the book contains lots of puzzles that will undoubtedly cost you many nights of sleep. I cannot overstate the effect the "Concurrency" chapter has had on my thought process when developing concurrent applications, regardless of the language.
- I highly recommend [Python Tricks](https://dbader.org/products/python-tricks-book/) by Dan Bader if you're looking to take your Python to the next level.

## Version Control
Quite possibly the most widely used and at the same time least acknowledged technology, version control has saved me from myself more times than I can count. I use Git on a daily basis and still marvel at the capabilities. There's countless ways of learning it, like this [Udacity course](https://www.udacity.com/course/how-to-use-git-and-github--ud775). Git is the most popular system, and if you get frustrated initially, maybe this will help:
![](../images/git.jpg)
from Navin Narra's [Tweet](https://twitter.com/navinnarra/status/842112112176513024)

And finally a few articles and opinions about git:

- [Git Magic](http://www-cs-students.stanford.edu/~blynn/gitmagic/) is an accessible page explaining how git works in an engaging manner.
- [Why you should stop using git rebase](https://blogg.bekk.no/why-you-should-stop-using-git-rebase-5552bee4fed1)
- [Anatomy of a perfect pull request](https://opensource.com/article/18/6/anatomy-perfect-pull-request) is a great resource on how to do pull requests the right way. I get back to this every so often to remind myself of the best practices.

## Design Patterns and Architecture
This first section focuses on articles about patterns...

- [Software Testing Anti-Patterns](http://blog.codepipes.com/testing/software-testing-antipatterns.html)
... while the second section is more about architecture, or at least thoughts about the structure of projects.

- [Why your next Open Source project may only be an interface](https://www.oreilly.com/ideas/why-your-next-open-source-project-may-only-be-an-interface)

## Distributed Systems
There's an incredible knowledge base out there. I'll just list a few pieces that really inspired me to get into Distributed Systems.

- Jim Kurose and Keith Ross' [Computer Networking - A Top Down Approach](https://kuroseross.wordpress.com/about/) convinced me to study Computer Science in the first place. Besides, it played a major part in my decision to go to UMass Amherst, and taking Jim Kurose's grad class on Advanced Computer Networks was simply amazing. The book manages to pick you up from wherever you stand, as an absolute beginner or even if you're familiar with some of the basics of networked communication, and explains the concepts in an engaging manner that will make you understand why things are a certain way. I particularly loved the section on TCP and the various models the book talks about until finally arriving at TCP.</li>
- Andrew S. Tanenbaum's Modern Operating Systems book really changed the way I think about computers. At the time, I considered operating systems as a black box that does whatever I ask it to do. It is humbling to read about all the work that's been done to make life for users and application developers easier. Must-read for every aspiring CS student.</li>
- Maarten van Steen and Andrew S. Tanenbaum's [Distributed Systems](https://www.distributed-systems.net/index.php/books/distributed-systems-3rd-edition-2017/) was the book to a grad class on Distributed Systems I took at UMass Amherst. Great read for foundational ideas on the big problems in the field, and how they can be solved.</li>

Since I've been working on microservices for a little while, here are a few resources on that topic I recommend:

- [Martin Fowler](https://martinfowler.com/microservices/)
- A great article on [Testing Microservices, the sane way](https://medium.com/@copyconstruct/testing-microservices-the-sane-way-9bb31d158c16?_hsenc=p2ANqtz-9g6uVUYGrgsuF6aoFHOTSplbJB232RwmKYBKUzQS5jCwhE2JXhYCWY_0t038ZZJmdqj7vdK0ONRmBX3IcDMdQ3bdu38w&_hsmi=60140430) by Cindy Sridharan.

## Work Environment
- Paul Graham's [Maker's Schedule, Manager's Schedule](http://paulgraham.com/makersschedule.html) captures the effect of meetings on an engineer's day at work. There's certainly different kinds of roles and various kinds of meetings, but the general idea is still valid: engineers need large continuous chunks of time to get things done.
- [Get happy developers to do what you want](https://sdtimes.com/softwaredev/get-happy-developers-to-do-what-you-want/) by Jessica Kerr talks about how removing friction is the right way to get people to do things, instead of settings rules or (potentially misguided) incentives.

## Interviewing
Coming soon!