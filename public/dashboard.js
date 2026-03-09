// connect to socket
const socket = io();

// check connection
socket.on("connect", () => {
    console.log("Dashboard connected to socket");
});

// reload dashboard when new order arrives
socket.on("newOrder", () => {
    console.log("New order received in dashboard");
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

if(!itemsCount[item.name]){
itemsCount[item.name] = 0;
}

itemsCount[item.name] += item.qty;

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

list.innerHTML = "";   // clear old list

orders.slice(-10).reverse().forEach(order=>{

list.innerHTML += `
<li>Order #${order.orderNumber} - ₹${order.total}</li>
`;

});

}

// first load
loadDashboard();