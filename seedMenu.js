const mongoose = require("mongoose");
const fs = require("fs");
const MenuItem = require("./models/MenuItem");

/* CONNECT TO MONGODB */

mongoose.connect(
"mongodb+srv://jasonlee477_db_user:Deesanju-1984@cluster0.lhdovlw.mongodb.net/hungryhop?retryWrites=true&w=majority",
{
useNewUrlParser: true,
useUnifiedTopology: true
}
)
.then(() => {
    console.log("MongoDB Atlas Connected for Seeding");
    importMenu();
})
.catch(err => console.log(err));


/* IMPORT MENU FUNCTION */

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
