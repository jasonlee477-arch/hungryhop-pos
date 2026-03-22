/*
  seedMenu.js — Hungry Hop Complete Menu Seeder
  FIXED VERSION — handles all connection errors
*/

const mongoose = require("mongoose");
const MenuItem = require("./models/MenuItem");
const menuData = require("./menuSeed.json");

console.log("🔄 Connecting to MongoDB Atlas...");
console.log("📡 Make sure you are on mobile hotspot!");
console.log("");

// Fixed connection with all required options
mongoose.connect(
  "mongodb+srv://jasonlee477_db_user:Firstproject-2026@cluster0.lhdovlw.mongodb.net/hungryhop?retryWrites=true&w=majority&appName=Cluster0",
  {
    serverSelectionTimeoutMS: 30000,  // wait 30 seconds
    socketTimeoutMS: 45000,
    family: 4  // force IPv4 — fixes most Indian ISP issues
  }
)
.then(() => {
  console.log("✅ MongoDB Atlas Connected!");
  console.log("");
  seedMenu();
})
.catch(err => {
  console.log("❌ Connection Failed!");
  console.log("Error:", err.message);
  console.log("");
  console.log("🔧 Try these fixes:");
  console.log("1. Turn OFF home WiFi completely");
  console.log("2. Turn ON mobile hotspot on phone");
  console.log("3. Connect laptop to mobile hotspot");
  console.log("4. Run: node seedMenu.js again");
  console.log("");
  console.log("If still failing, check MongoDB Atlas:");
  console.log("→ atlas.mongodb.com → Network Access → Add 0.0.0.0/0");
  process.exit(1);
});

async function seedMenu() {
  try {
    console.log("🗑️  Clearing old menu items...");
    await MenuItem.deleteMany({});
    console.log("✅ Old menu cleared");
    console.log("");
    console.log("📥 Inserting 59 menu items...");

    const inserted = await MenuItem.insertMany(menuData);

    console.log(`✅ Successfully inserted ${inserted.length} items!\n`);
    console.log("📋 Menu Summary:");
    console.log("─────────────────────────────────");

    const cats = {};
    inserted.forEach(item => {
      cats[item.category] = (cats[item.category] || 0) + 1;
    });

    Object.entries(cats).forEach(([cat, count]) => {
      console.log(`  ${cat.padEnd(25)} ${count} items`);
    });

    console.log("─────────────────────────────────");
    console.log(`  TOTAL                      ${inserted.length} items`);
    console.log("");
    console.log("🎉 Done! Your menu is live on Railway.");
    console.log("🌐 Open your Railway URL to see all items with images!");

  } catch(err) {
    console.log("❌ Seeding Error:", err.message);
  } finally {
    await mongoose.connection.close();
    console.log("🔌 Connection closed.");
    process.exit(0);
  }
}