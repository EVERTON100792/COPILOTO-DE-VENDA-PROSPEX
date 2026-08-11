async function run() {
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      api_key: "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",
      query: "Academia Bronx Gym Rolândia PR telefone whatsapp site",
      max_results: 3
    })
  });
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}

run();
