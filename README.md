# Teaching Assistant Intelligence (TA.I)

TA.I helps presenters deliver better lectures by importing slide decks and offering presenter-only, real-time assistance. It keeps the audience view clean while showing private suggestions to the presenter. The vision includes two additional agents: smart suggestions (analyzes content of uploaded slides and gives recommended talking points and real-worTA.I analyzes speech and generates an end of presentation report so users can improve for future lectures).

Current focus: Google Slides import, presenter-only suggestions, and speech-to-text capture.

## Inspiration
We were inspired by the challenges many presenters face: staying on track, keeping audiences engaged, and delivering meaningful examples in real time. Having attended lectures and workshops ourselves, we noticed that presenters often struggle to balance delivering content with engaging students. TA.I was born from the idea of creating a teacher-first tool that improves learning outcomes for students without distracting the audience.

## What it does
TA.I is a web application that allows teachers to import slide decks and receive real-time, presenter-only guidance during lectures. It keeps the audience view clean while providing private prompts, suggested talking points, and feedback to the presenter. Looking ahead, TA.I aims to include two AI-powered features:

Smart Suggest: Analyzes slides to recommend talking points and real-world examples.
Summarizer: Monitors speech to generate post-lecture reports, helping presenters improve for future sessions.

## How we built it
We built TA.I as a web application with a dual-view interface: the audience sees only the slides, while the presenter has a private dashboard with real-time suggestions. The frontend is developed in TypeScript using Next.js, providing a responsive and interactive UI. Supabase handles the backend and real-time data synchronization, ensuring the presenter and audience stay perfectly in sync. For AI-powered features like Smart Suggest and Summarizer, we integrated Google ADK to analyze slide content and speech. Throughout development, we prioritized a lightweight, intuitive interface so teachers can focus on delivering engaging lectures rather than managing the tool.

## Challenges we ran into
- Real-time synchronization: Ensuring that the presenter’s suggestions and the audience slides stay in sync.
- Balancing AI support: Making recommendations helpful without being distracting.
- Time constraints: Implementing a working prototype with a polished dual-view interface during the hackathon.

## Accomplishments that we're proud of
- Successfully created a working dual-view system separating audience and presenter interfaces.
- Implemented real-time private suggestions, enhancing the lecture experience.
- Designed a scalable vision for future AI features like Smart Suggest and Summarizer.
- Developed a clean, intuitive UI that teachers can use without training.

## What we learned
- Real-time collaboration tools are challenging but rewarding to implement.
- Effective AI assistance requires careful design to avoid overwhelming users.
- Building a teacher-focused product requires balancing technical innovation with user experience.
- Rapid prototyping under time pressure forces the team to prioritize the most impactful features.

## What's next for TA.I
- Implement Smart Suggest to automatically generate recommended talking points and examples from slides.
- Allow the Smart Suggest to nudge presenters when they stray off topic.
- Collect user feedback from educators to refine the interface and AI suggestions.
