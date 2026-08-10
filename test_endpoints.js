fetch('https://overpass.kumi.systems/api/interpreter', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
  body: 'data=' + encodeURIComponent('[out:json][timeout:5];\n(\n  nwr["shop"~"^(car_repair)$"](-23.390000,-51.540000,-23.160000,-51.290000);\n);\nout center 5;')
}).then(r => console.log('Kumi:', r.status)).catch(e => console.log('Kumi Error:', e.message));

fetch('https://overpass.private.coffee/api/interpreter', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
  body: 'data=' + encodeURIComponent('[out:json][timeout:5];\n(\n  nwr["shop"~"^(car_repair)$"](-23.390000,-51.540000,-23.160000,-51.290000);\n);\nout center 5;')
}).then(r => console.log('Coffee:', r.status)).catch(e => console.log('Coffee Error:', e.message));
