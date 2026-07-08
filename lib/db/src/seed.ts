import { db } from "./index.js";
import { categoriesTable, websitesTable, talkCategoriesTable } from "./schema/index.js";
import { eq } from "drizzle-orm";

function domain(url: string) {
  return new URL(url).hostname.replace(/^www\./, "");
}

async function seed() {
  console.log("Seeding categories...");
  const CATS = [
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

  for (const cat of CATS) {
    const exists = await db
      .select()
      .from(categoriesTable)
      .where(eq(categoriesTable.name, cat.name));
    if (exists.length === 0) {
      await db.insert(categoriesTable).values(cat);
    }
  }
  const allCats = await db.select().from(categoriesTable);
  const catMap: Record<string, number> = {};
  for (const c of allCats) catMap[c.name] = c.id;
  console.log("Categories:", Object.keys(catMap));

  const SITES = [
    // Free (10)
    { name: "Instacart", url: "https://www.instacart.com", catName: "Food & Delivery", isFree: true, tabOrder: 1 },
    { name: "Uber Eats", url: "https://www.ubereats.com", catName: "Food & Delivery", isFree: true, tabOrder: 2 },
    { name: "TaskRabbit", url: "https://www.taskrabbit.com", catName: "Gig Work", isFree: true, tabOrder: 3 },
    { name: "Freelancer", url: "https://www.freelancer.com", catName: "Gig Work", isFree: true, tabOrder: 4 },
    { name: "ZipRecruiter", url: "https://www.ziprecruiter.com", catName: "Jobs", isFree: true, tabOrder: 5 },
    { name: "OfferUp", url: "https://offerup.com", catName: "Shopping", isFree: true, tabOrder: 6 },
    { name: "Vrbo", url: "https://www.vrbo.com", catName: "Travel & Rentals", isFree: true, tabOrder: 7 },
    { name: "YouTube", url: "https://www.youtube.com", catName: "Entertainment", isFree: true, tabOrder: 8 },
    { name: "SeatGeek", url: "https://seatgeek.com", catName: "Events & Tickets", isFree: true, tabOrder: 9 },
    { name: "Walmart", url: "https://www.walmart.com", catName: "Shopping", isFree: true, tabOrder: 10 },
    // Pro
    { name: "DoorDash", url: "https://www.doordash.com", catName: "Food & Delivery", isFree: false, tabOrder: 11 },
    { name: "Grubhub", url: "https://www.grubhub.com", catName: "Food & Delivery", isFree: false, tabOrder: 12 },
    { name: "Fiverr", url: "https://www.fiverr.com", catName: "Gig Work", isFree: false, tabOrder: 13 },
    { name: "Upwork", url: "https://www.upwork.com", catName: "Gig Work", isFree: false, tabOrder: 14 },
    { name: "Indeed", url: "https://www.indeed.com", catName: "Jobs", isFree: false, tabOrder: 15 },
    { name: "LinkedIn", url: "https://www.linkedin.com", catName: "Jobs", isFree: false, tabOrder: 16 },
    { name: "Amazon", url: "https://www.amazon.com", catName: "Shopping", isFree: false, tabOrder: 17 },
    { name: "eBay", url: "https://www.ebay.com", catName: "Shopping", isFree: false, tabOrder: 18 },
    { name: "Airbnb", url: "https://www.airbnb.com", catName: "Travel & Rentals", isFree: false, tabOrder: 19 },
    { name: "Expedia", url: "https://www.expedia.com", catName: "Travel & Rentals", isFree: false, tabOrder: 20 },
    { name: "Netflix", url: "https://www.netflix.com", catName: "Entertainment", isFree: false, tabOrder: 21 },
    { name: "Ticketmaster", url: "https://www.ticketmaster.com", catName: "Events & Tickets", isFree: false, tabOrder: 22 },
    { name: "StubHub", url: "https://www.stubhub.com", catName: "Events & Tickets", isFree: false, tabOrder: 23 },
    { name: "Robinhood", url: "https://robinhood.com", catName: "Finance", isFree: false, tabOrder: 24 },
    { name: "Coinbase", url: "https://www.coinbase.com", catName: "Finance", isFree: false, tabOrder: 25 },
    { name: "Reddit", url: "https://www.reddit.com", catName: "Social", isFree: false, tabOrder: 26 },
    { name: "X (Twitter)", url: "https://x.com", catName: "Social", isFree: false, tabOrder: 27 },
  ];

  console.log("Seeding websites...");
  let inserted = 0;
  for (const s of SITES) {
    const exists = await db
      .select()
      .from(websitesTable)
      .where(eq(websitesTable.name, s.name));
    if (exists.length === 0) {
      await db.insert(websitesTable).values({
        name: s.name,
        url: s.url,
        displayDomain: domain(s.url),
        isFree: s.isFree,
        categoryId: catMap[s.catName],
        tabOrder: s.tabOrder,
      });
      inserted++;
    }
  }
  console.log(`Inserted ${inserted} websites`);

  console.log("Seeding talk categories...");
  const TALK_CATS = [
    { name: "Citizen Vote", emoji: "🌍", sortOrder: 1 },
    { name: "News & Current Events", emoji: "📰", sortOrder: 2 },
    { name: "Business & Entrepreneurship", emoji: "💼", sortOrder: 3 },
    { name: "Finance & Investing", emoji: "💰", sortOrder: 4 },
    { name: "Technology & AI", emoji: "💻", sortOrder: 5 },
    { name: "Gaming", emoji: "🎮", sortOrder: 6 },
    { name: "Entertainment", emoji: "🎬", sortOrder: 7 },
    { name: "Music & Audio", emoji: "🎵", sortOrder: 8 },
    { name: "Art & Creativity", emoji: "🎨", sortOrder: 9 },
    { name: "Education & Learning", emoji: "📚", sortOrder: 10 },
    { name: "Science & Research", emoji: "🔬", sortOrder: 11 },
    { name: "Health & Wellness", emoji: "❤️", sortOrder: 12 },
    { name: "Fitness & Sports", emoji: "🏋️", sortOrder: 13 },
    { name: "Food & Cooking", emoji: "🍳", sortOrder: 14 },
    { name: "Home & Lifestyle", emoji: "🏡", sortOrder: 15 },
    { name: "Travel & Outdoors", emoji: "🌎", sortOrder: 16 },
    { name: "Automotive & Transportation", emoji: "🚗", sortOrder: 17 },
    { name: "Pets & Animals", emoji: "🐶", sortOrder: 18 },
    { name: "Family & Relationships", emoji: "💞", sortOrder: 19 },
    { name: "Shopping & Marketplace", emoji: "🛒", sortOrder: 20 },
    { name: "Hobbies & DIY", emoji: "💡", sortOrder: 21 },
  ];
  let talkInserted = 0;
  for (const tc of TALK_CATS) {
    const exists = await db.select().from(talkCategoriesTable).where(eq(talkCategoriesTable.name, tc.name));
    if (exists.length === 0) {
      await db.insert(talkCategoriesTable).values(tc);
      talkInserted++;
    }
  }
  console.log(`Inserted ${talkInserted} talk categories`);

  console.log("Seed complete!");
  process.exit(0);
}

seed().catch((e) => { console.error(e); process.exit(1); });
