const mongoose = require("mongoose");
const fs = require("fs");
const MenuItem = require("./models/MenuItem");

mongoose.connect(
"mongodb://jasonlee477_db_user:Firstproject-2026@cluster0.lhdovlw.mongodb.net/hungryhop?retryWrites=true&w=majority&appName=Cluster0"
)
.then(()=>console.log("✅ MongoDB Atlas Connected"))
.catch(err=>console.log("Mongo Error:",err));

const importMenu = async () => {

try {

const data = fs.readFileSync("./menuSeed.json","utf-8");
const menuItems = JSON.parse(data);

console.log("Deleting old menu...");
await MenuItem.deleteMany({});

console.log("Importing new menu...");
await MenuItem.insertMany(menuItems);

console.log("✅ Menu Imported Successfully");

process.exit();

} catch (error) {

console.error(error);
process.exit(1);

}

};

importMenu();