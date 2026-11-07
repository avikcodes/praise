export type FaqItem = {
  question: string;
  answer: string;
  category?: string;
};

/**
 * The FAQ copy, shared by the visible FAQ page, home section, and the
 * FAQPage structured data so schema and visible copy cannot drift.
 */
export const faqs: FaqItem[] = [
  {
    question: "What is Praise?",
    category: "General",
    answer:
      "Praise is a free, open-source, self-hosted platform for collecting, organizing, and showcasing customer testimonials. You share custom collection links or invitation prompts, customers submit text testimonials, record videos, or leave audio notes, your team moderates and tags them in an admin library, and you publish them onto your website using customizable embed widgets or a dedicated Wall of Love.",
  },
  {
    question: "Is Praise free?",
    category: "General",
    answer:
      "Yes. Praise is 100% free software. There are no subscription tiers, no paywalls on video storage, no limits on the number of testimonials you collect, and no per-seat fees. You only pay for your own underlying server and storage infrastructure where you choose to run Praise.",
  },
  {
    question: "Is Praise open source?",
    category: "General",
    answer:
      "Yes. Praise is built in the open and is designed under the GNU Affero General Public License v3.0 (AGPL-3.0), which applies once the LICENSE file is placed in the repository. This ensures that Praise remains free software and that any modifications contributed to community deployments remain transparent and accessible.",
  },
  {
    question: "Can I self-host Praise?",
    category: "Deployment",
    answer:
      "Yes. Self-hosting is the primary way Praise is designed to be deployed. Using Docker Compose, you can run Praise on any standard Linux VPS, bare-metal server, cloud VM, or container environment. The application runs alongside PostgreSQL and stores media files directly on your mounted volumes or an S3-compatible bucket.",
  },
  {
    question: "Can I collect video testimonials?",
    category: "Collection",
    answer:
      "Yes. Praise includes video collection capabilities. Customers can record a video testimonial directly inside their browser without installing extra software or mobile apps, or upload a pre-recorded video file. Video uploads are stored on your self-hosted disks or configured object storage.",
  },
  {
    question: "Can I collect audio testimonials?",
    category: "Collection",
    answer:
      "Yes. For customers who want to speak openly without turning on a camera, Praise offers native voice note recording. Customers speak into their microphone or upload an audio file, and the recording is processed into your moderation inbox alongside written ratings and questionnaire answers.",
  },
  {
    question: "Can I embed widgets on my website?",
    category: "Publishing",
    answer:
      "Yes. Praise provides multiple responsive widget layouts, including Grid layouts for landing pages, horizontal Carousels for compact product cards, single Quote cards for feature callouts, and full-page Walls of Love. Widgets can be embedded into any HTML site with a script tag or integrated using React and Next.js component wrappers.",
  },
  {
    question: "Can I import existing testimonials?",
    category: "Management",
    answer:
      "Import capabilities are part of our Complete Release roadmap. The planned import pipeline will allow teams to import existing customer quotes from CSV/JSON files, as well as sync public praise from platforms like X (Twitter), LinkedIn, and review portals. In the current release, testimonials can be ingested directly through collection forms or the database.",
  },
  {
    question: "Does Praise support APIs and webhooks?",
    category: "Developers",
    answer:
      "Yes, an open developer architecture is core to Praise. The REST API specification covers reading approved testimonials, submitting new entries, and querying widget configurations. Webhook notifications are planned to broadcast events (such as new submissions or moderation status updates) to external services, CRMs, or Slack channels.",
  },
  {
    question: "Does Praise support the Model Context Protocol (MCP)?",
    category: "AI",
    answer:
      "An MCP server is currently in planned development. The goal is to provide a local MCP server interface that allows AI assistants (such as Claude Desktop, Cursor, or Antigravity) to query your approved testimonial database with semantic filters, without your customer data ever leaving your own private network.",
  },
  {
    question: "Will Praise work with ChatGPT?",
    category: "AI",
    answer:
      "A ChatGPT App integration (custom GPT action) is planned on our Intelligence roadmap. This will allow authorized workspace users to query approved testimonials from ChatGPT using secure API tokens. Because this integration is on the roadmap, it is not yet active in the current release.",
  },
  {
    question: "Who pays for hosting and storage?",
    category: "Deployment",
    answer:
      "You pay your hosting provider directly for whatever server resources you use. Because Praise is self-hosted on your own infrastructure (such as Hetzner, DigitalOcean, AWS, or your home lab), there are no SaaS surcharges or bandwidth markups. A lightweight VM starting at $4 to $10/month can comfortably handle thousands of customer testimonials.",
  },
  {
    question: "Can I export my data?",
    category: "Security",
    answer:
      "Yes. You retain 100% ownership of your data at all times. Testimonials and metadata can be exported directly as standard JSON and CSV files, raw media files remain on your disk, and you have direct access to your PostgreSQL database. There is zero vendor lock-in.",
  },
  {
    question: "Can I contribute to Praise?",
    category: "Community",
    answer:
      "Absolutely. As an open-source project, Praise welcomes contributions from developers, designers, and technical writers. You can report bugs, submit pull requests for widget designs, help build SDKs, improve documentation, or propose roadmap features through our public GitHub repository.",
  },
];
