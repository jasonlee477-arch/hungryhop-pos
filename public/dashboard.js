// connect to socket (FIXED FOR RAILWAY)
const socket = io("https://hungryhop-pos-production.up.railway.app", {
    transports: ["websocket"],
});

// debug connection
socket.on("connect", () => {
    console.log("✅ Dashboard connected:", socket.id);
});

socket.on("disconnect", () => {
    console.log("❌ Dashboard disconnected");
});

socket.on("connect_error", (err) => {
    console.log("⚠️ Connection error:", err.message);
});

// ✅ FIXED EVENT NAME
socket.on("new-order", (order) => {
    console.log("🔥 New order received in dashboard", order);
    loadDashboard();
});

async function loadDashboard(){

    const res = await fetch("/orders");
    const orders = await res.json();

    // total orders
    document.getElementById("totalOrders").innerText = orders.length;

    let revenue = 0;
    let itemsCount = {};

    // calculate revenue + item counts
    orders.forEach(order=>{

        revenue += order.total;

        order.items.forEach(item=>{

            // support both object & string (safe)
            const itemName = item.name || item;

            if(!itemsCount[itemName]){
                itemsCount[itemName] = 0;
            }

            itemsCount[itemName] += item.qty || 1;

        });

    });

    // update revenue
    document.getElementById("revenue").innerText = "₹" + revenue;

    // find top selling item
    let topItem = "-";
    let max = 0;

    for(let item in itemsCount){
        if(itemsCount[item] > max){
            max = itemsCount[item];
            topItem = item;
        }
    }

    document.getElementById("topItem").innerText = topItem;

    // show recent orders
    const list = document.getElementById("ordersList");

    list.innerHTML = "";

    orders.slice(-10).reverse().forEach(order=>{
        list.innerHTML += `
        <li>Order #${order.orderNumber} - ₹${order.total}</li>
        `;
    });

}

// first load
loadDashboard();