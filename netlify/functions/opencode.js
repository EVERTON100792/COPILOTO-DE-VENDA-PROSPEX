// netlify/functions/opencode.js

// This function acts as a secure proxy to the OpenCode.ai API.
// It forwards requests from the frontend, adding the secret API key
// from environment variables before sending it to OpenCode.ai.
// This prevents the API key from being exposed in the browser.

exports.handler = async function(event, context) {
  // Get the API key from Netlify's environment variables
  const apiKey = process.env.VITE_AI_API_KEY;

  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "API key is not configured. Please set VITE_AI_API_KEY in your Netlify environment variables." }),
    };
  }

  // Determine the target URL. The original path from the request is available in event.path.
  // We need to strip the function path prefix.
  // e.g., /.netlify/functions/opencode/zen/v1/chat/completions -> /zen/v1/chat/completions
  const functionPath = '/.netlify/functions/opencode';
  const apiPath = event.path.startsWith(functionPath) ? event.path.substring(functionPath.length) : event.path;
  
  // The original request was to /api/opencode_go/* or /api/opencode_zen/*
  // We need to reconstruct the correct path for the opencode.ai API.
  // The part of the path after /api/opencode_... is what we need.
  // event.path for a call to /api/opencode_go/zen/go/v1/models is /.netlify/functions/opencode/zen/go/v1/models
  // and we want to call https://opencode.ai/zen/go/v1/models
  const targetUrl = `https://opencode.ai${apiPath}`;

  console.log(`[Proxy Function] Forwarding request to: ${targetUrl}`);
  
  try {
    const response = await fetch(targetUrl, {
      method: event.httpMethod,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        // Forward any other headers from the original request if needed
        ...event.headers,
        // Host header must be re-written to the target host
        host: "opencode.ai",
      },
      body: event.body,
    });

    const data = await response.text();

    return {
      statusCode: response.status,
      body: data,
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "application/json",
      },
    };
  } catch (error) {
    console.error("[Proxy Function] Error forwarding request:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "An error occurred while proxying the request." }),
    };
  }
};
