import { db } from "@workspace/db";
import { categoriesTable as categories, websitesTable as websites } from "@workspace/db/schema";

const CATEGORIES_DATA = [
  { name: "Food & Delivery", sortOrder: 1 },
  { name: "Gig Work", sortOrder: 2 },
  { name: "Jobs", sortOrder: 3 },
  { name: "Shopping", sortOrder: 4 },
  { name: "Entertainment", sortOrder: 5 },
  { name: "Travel & Rentals", sortOrder: 6 },
  { name: "Events & Tickets", sortOrder: 7 },
  { name: "Finance", sortOrder: 8 },
  { name: "News", sortOrder: 9 },
  { name: "Social", sortOrder: 10 },
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
    catMap[c.name] = c.id;
  }

  const fd = catMap["Food & Delivery"]!;
  const gw = catMap["Gig Work"]!;
  const jo = catMap["Jobs"]!;
  const sh = catMap["Shopping"]!;
  const en = catMap["Entertainment"]!;
  const tr = catMap["Travel & Rentals"]!;
  const ev = catMap["Events & Tickets"]!;
  const fi = catMap["Finance"]!;
  const so = catMap["Social"]!;

  const WEBSITES_DATA = [
    // Free (10)
    {
      name: "Instacart",
      url: "https://www.instacart.com",
      displayDomain: "instacart.com",
      categoryId: fd,
      isFree: true,
      sortOrder: 1,
      description: "Grocery delivery from local stores",
    },
    {
      name: "Uber Eats",
      url: "https://www.ubereats.com",
      displayDomain: "ubereats.com",
      categoryId: fd,
      isFree: true,
      sortOrder: 2,
      description: "Food delivery from restaurants near you",
    },
    {
      name: "TaskRabbit",
      url: "https://www.taskrabbit.com",
      displayDomain: "taskrabbit.com",
      categoryId: gw,
      isFree: true,
      sortOrder: 3,
      description: "Hire trusted local handypeople",
    },
    {
      name: "Freelancer",
      url: "https://www.freelancer.com",
      displayDomain: "freelancer.com",
      categoryId: gw,
      isFree: true,
      sortOrder: 4,
      description: "Find freelance jobs and hire talent",
    },
    {
      name: "ZipRecruiter",
      url: "https://www.ziprecruiter.com",
      displayDomain: "ziprecruiter.com",
      categoryId: jo,
      isFree: true,
      sortOrder: 5,
      description: "Job search and hiring platform",
    },
    {
      name: "OfferUp",
      url: "https://offerup.com",
      displayDomain: "offerup.com",
      categoryId: sh,
      isFree: true,
      sortOrder: 6,
      description: "Buy and sell locally",
    },
    {
      name: "Vrbo",
      url: "https://www.vrbo.com",
      displayDomain: "vrbo.com",
      categoryId: tr,
      isFree: true,
      sortOrder: 7,
      description: "Vacation rentals for families",
    },
    {
      name: "YouTube",
      url: "https://www.youtube.com",
      displayDomain: "youtube.com",
      categoryId: en,
      isFree: true,
      sortOrder: 8,
      description: "Video sharing and streaming",
    },
    {
      name: "SeatGeek",
      url: "https://seatgeek.com",
      displayDomain: "seatgeek.com",
      categoryId: ev,
      isFree: true,
      sortOrder: 9,
      description: "Tickets for sports, concerts & more",
    },
    {
      name: "Walmart",
      url: "https://www.walmart.com",
      displayDomain: "walmart.com",
      categoryId: sh,
      isFree: true,
      sortOrder: 10,
      description: "Everyday low prices, online & in-store",
    },
    // Pro (17)
    {
      name: "DoorDash",
      url: "https://www.doordash.com",
      displayDomain: "doordash.com",
      categoryId: fd,
      isFree: false,
      sortOrder: 11,
      description: "Restaurant delivery at your door",
    },
    {
      name: "Grubhub",
      url: "https://www.grubhub.com",
      displayDomain: "grubhub.com",
      categoryId: fd,
      isFree: false,
      sortOrder: 12,
      description: "Order food online from local restaurants",
    },
    {
      name: "Fiverr",
      url: "https://www.fiverr.com",
      displayDomain: "fiverr.com",
      categoryId: gw,
      isFree: false,
      sortOrder: 13,
      description: "Freelance services marketplace",
    },
    {
      name: "Upwork",
      url: "https://www.upwork.com",
      displayDomain: "upwork.com",
      categoryId: gw,
      isFree: false,
      sortOrder: 14,
      description: "Top freelance marketplace for businesses",
    },
    {
      name: "Indeed",
      url: "https://www.indeed.com",
      displayDomain: "indeed.com",
      categoryId: jo,
      isFree: false,
      sortOrder: 15,
      description: "World's #1 job site",
    },
    {
      name: "LinkedIn",
      url: "https://www.linkedin.com",
      displayDomain: "linkedin.com",
      categoryId: jo,
      isFree: false,
      sortOrder: 16,
      description: "Professional networking and jobs",
    },
    {
      name: "Amazon",
      url: "https://www.amazon.com",
      displayDomain: "amazon.com",
      categoryId: sh,
      isFree: false,
      sortOrder: 17,
      description: "Earth's biggest selection",
    },
    {
      name: "eBay",
      url: "https://www.ebay.com",
      displayDomain: "ebay.com",
      categoryId: sh,
      isFree: false,
      sortOrder: 18,
      description: "Buy and sell electronics, cars, clothing",
    },
    {
      name: "Airbnb",
      url: "https://www.airbnb.com",
      displayDomain: "airbnb.com",
      categoryId: tr,
      isFree: false,
      sortOrder: 19,
      description: "Book unique homes and experiences",
    },
    {
      name: "Expedia",
      url: "https://www.expedia.com",
      displayDomain: "expedia.com",
      categoryId: tr,
      isFree: false,
      sortOrder: 20,
      description: "Flights, hotels, cars, and vacation packages",
    },
    {
      name: "Netflix",
      url: "https://www.netflix.com",
      displayDomain: "netflix.com",
      categoryId: en,
      isFree: false,
      sortOrder: 21,
      description: "Watch TV shows and movies online",
    },
    {
      name: "Ticketmaster",
      url: "https://www.ticketmaster.com",
      displayDomain: "ticketmaster.com",
      categoryId: ev,
      isFree: false,
      sortOrder: 22,
      description: "Official ticket marketplace",
    },
    {
      name: "StubHub",
      url: "https://www.stubhub.com",
      displayDomain: "stubhub.com",
      categoryId: ev,
      isFree: false,
      sortOrder: 23,
      description: "World's largest ticket marketplace",
    },
    {
      name: "Robinhood",
      url: "https://robinhood.com",
      displayDomain: "robinhood.com",
      categoryId: fi,
      isFree: false,
      sortOrder: 24,
      description: "Invest in stocks, ETFs & crypto",
    },
    {
      name: "Coinbase",
      url: "https://www.coinbase.com",
      displayDomain: "coinbase.com",
      categoryId: fi,
      isFree: false,
      sortOrder: 25,
      description: "Buy, sell and manage cryptocurrency",
    },
    {
      name: "Reddit",
      url: "https://www.reddit.com",
      displayDomain: "reddit.com",
      categoryId: so,
      isFree: false,
      sortOrder: 26,
      description: "The front page of the internet",
    },
    {
      name: "X (Twitter)",
      url: "https://x.com",
      displayDomain: "x.com",
      categoryId: so,
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
