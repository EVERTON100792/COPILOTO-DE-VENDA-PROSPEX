const query = `[out:json][timeout:25];
(
  nwr["shop"~"^(car_repair)$"](-23.390000,-51.540000,-23.160000,-51.290000);
);
out center 5;`;

fetch('https://overpass-api.de/api/interpreter', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Accept': 'application/json',
    'User-Agent': 'Prospex/1.0'
  },
  body: 'data=' + encodeURIComponent(query)
}).then(async r => {
  console.log('Status:', r.status);
  console.log('Body:', await r.text());
});
