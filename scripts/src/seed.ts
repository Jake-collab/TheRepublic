import { db } from "@workspace/db";
import { categories, websites } from "@workspace/db/schema";

const CATEGORIES_DATA = [
  { name: "Food & Delivery", slug: "food-delivery", sortOrder: 1 },
  { name: "Gig Work", slug: "gig-work", sortOrder: 2 },
  { name: "Jobs", slug: "jobs", sortOrder: 3 },
  { name: "Shopping", slug: "shopping", sortOrder: 4 },
  { name: "Entertainment", slug: "entertainment", sortOrder: 5 },
  { name: "Travel & Rentals", slug: "travel-rentals", sortOrder: 6 },
  { name: "Events & Tickets", slug: "events-tickets", sortOrder: 7 },
  { name: "Finance", slug: "finance", sortOrder: 8 },
  { name: "News", slug: "news", sortOrder: 9 },
  { name: "Social", slug: "social", sortOrder: 10 },
];

async function seed() {
  console.log("Seeding categories...");

  const insertedCats = await db
    .insert(categories)
    .values(CATEGORIES_DATA)
    .onConflictDoNothing()
    .returning();

  console.log(`Inserted ${insertedCats.length} categories`);

  const catMap: Record<string, number> = {};
  const allCats = await db.select().from(categories);
  for (const c of allCats) {
    catMap[c.slug] = c.id;
  }

  const WEBSITES_DATA = [
    // Free (10)
    {
      name: "Instacart",
      url: "https://www.instacart.com",
      categoryId: catMap["food-delivery"]!,
      isFree: true,
      sortOrder: 1,
      description: "Grocery delivery from local stores",
    },
    {
      name: "Uber Eats",
      url: "https://www.ubereats.com",
      categoryId: catMap["food-delivery"]!,
      isFree: true,
      sortOrder: 2,
      description: "Food delivery from restaurants near you",
    },
    {
      name: "TaskRabbit",
      url: "https://www.taskrabbit.com",
      categoryId: catMap["gig-work"]!,
      isFree: true,
      sortOrder: 3,
      description: "Hire trusted local handypeople",
    },
    {
      name: "Freelancer",
      url: "https://www.freelancer.com",
      categoryId: catMap["gig-work"]!,
      isFree: true,
      sortOrder: 4,
      description: "Find freelance jobs and hire talent",
    },
    {
      name: "ZipRecruiter",
      url: "https://www.ziprecruiter.com",
      categoryId: catMap["jobs"]!,
      isFree: true,
      sortOrder: 5,
      description: "Job search and hiring platform",
    },
    {
      name: "OfferUp",
      url: "https://offerup.com",
      categoryId: catMap["shopping"]!,
      isFree: true,
      sortOrder: 6,
      description: "Buy and sell locally",
    },
    {
      name: "Vrbo",
      url: "https://www.vrbo.com",
      categoryId: catMap["travel-rentals"]!,
      isFree: true,
      sortOrder: 7,
      description: "Vacation rentals for families",
    },
    {
      name: "YouTube",
      url: "https://www.youtube.com",
      categoryId: catMap["entertainment"]!,
      isFree: true,
      sortOrder: 8,
      description: "Video sharing and streaming",
    },
    {
      name: "SeatGeek",
      url: "https://seatgeek.com",
      categoryId: catMap["events-tickets"]!,
      isFree: true,
      sortOrder: 9,
      description: "Tickets for sports, concerts & more",
    },
    {
      name: "Walmart",
      url: "https://www.walmart.com",
      categoryId: catMap["shopping"]!,
      isFree: true,
      sortOrder: 10,
      description: "Everyday low prices, online & in-store",
    },
    // Pro sites
    {
      name: "DoorDash",
      url: "https://www.doordash.com",
      categoryId: catMap["food-delivery"]!,
      isFree: false,
      sortOrder: 11,
      description: "Restaurant delivery at your door",
    },
    {
      name: "Grubhub",
      url: "https://www.grubhub.com",
      categoryId: catMap["food-delivery"]!,
      isFree: false,
      sortOrder: 12,
      description: "Order food online from local restaurants",
    },
    {
      name: "Fiverr",
      url: "https://www.fiverr.com",
      categoryId: catMap["gig-work"]!,
      isFree: false,
      sortOrder: 13,
      description: "Freelance services marketplace",
    },
    {
      name: "Upwork",
      url: "https://www.upwork.com",
      categoryId: catMap["gig-work"]!,
      isFree: false,
      sortOrder: 14,
      description: "Top freelance marketplace for businesses",
    },
    {
      name: "Indeed",
      url: "https://www.indeed.com",
      categoryId: catMap["jobs"]!,
      isFree: false,
      sortOrder: 15,
      description: "World's #1 job site",
    },
    {
      name: "LinkedIn",
      url: "https://www.linkedin.com",
      categoryId: catMap["jobs"]!,
      isFree: false,
      sortOrder: 16,
      description: "Professional networking and jobs",
    },
    {
      name: "Amazon",
      url: "https://www.amazon.com",
      categoryId: catMap["shopping"]!,
      isFree: false,
      sortOrder: 17,
      description: "Earth's biggest selection",
    },
    {
      name: "eBay",
      url: "https://www.ebay.com",
      categoryId: catMap["shopping"]!,
      isFree: false,
      sortOrder: 18,
      description: "Buy and sell electronics, cars, clothing",
    },
    {
      name: "Airbnb",
      url: "https://www.airbnb.com",
      categoryId: catMap["travel-rentals"]!,
      isFree: false,
      sortOrder: 19,
      description: "Book unique homes and experiences",
    },
    {
      name: "Expedia",
      url: "https://www.expedia.com",
      categoryId: catMap["travel-rentals"]!,
      isFree: false,
      sortOrder: 20,
      description: "Flights, hotels, cars, and vacation packages",
    },
    {
      name: "Netflix",
      url: "https://www.netflix.com",
      categoryId: catMap["entertainment"]!,
      isFree: false,
      sortOrder: 21,
      description: "Watch TV shows and movies online",
    },
    {
      name: "Ticketmaster",
      url: "https://www.ticketmaster.com",
      categoryId: catMap["events-tickets"]!,
      isFree: false,
      sortOrder: 22,
      description: "Official ticket marketplace",
    },
    {
      name: "StubHub",
      url: "https://www.stubhub.com",
      categoryId: catMap["events-tickets"]!,
      isFree: false,
      sortOrder: 23,
      description: "World's largest ticket marketplace",
    },
    {
      name: "Robinhood",
      url: "https://robinhood.com",
      categoryId: catMap["finance"]!,
      isFree: false,
      sortOrder: 24,
      description: "Invest in stocks, ETFs & crypto",
    },
    {
      name: "Coinbase",
      url: "https://www.coinbase.com",
      categoryId: catMap["finance"]!,
      isFree: false,
      sortOrder: 25,
      description: "Buy, sell and manage cryptocurrency",
    },
    {
      name: "Reddit",
      url: "https://www.reddit.com",
      categoryId: catMap["social"]!,
      isFree: false,
      sortOrder: 26,
      description: "The front page of the internet",
    },
    {
      name: "X (Twitter)",
      url: "https://x.com",
      categoryId: catMap["social"]!,
      isFree: false,
      sortOrder: 27,
      description: "Real-time news and social platform",
    },
  ];

  console.log("Seeding websites...");
  const insertedSites = await db
    .insert(websites)
    .values(WEBSITES_DATA)
    .onConflictDoNothing()
    .returning();

  console.log(`Inserted ${insertedSites.length} websites`);
  console.log("Seed complete!");
  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
