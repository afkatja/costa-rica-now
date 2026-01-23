// Debug test function to understand the RSN API issue
// This will help us understand why browsers work but Edge Functions don't

const url =
  "https://www.isc.ac.uk/fdsnws/event/1/query?starttime=2025-01-01&endtime=2025-01-02&minlatitude=8.0&maxlatitude=12.0&minlongitude=-86.0&maxlongitude=-82.0&minmagnitude=2.5"

console.log("Testing URL:", url)

// Test with minimal headers first
const response1 = await fetch(url, {
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  },
})

console.log("Test 1 - Minimal headers:")
console.log("Status:", response1.status, response1.statusText)
console.log("Headers:", Object.fromEntries(response1.headers.entries()))
console.log("URL after request:", response1.url)
console.log("Redirected:", response1.redirected)

if (response1.status === 200) {
  const text = await response1.text()
  console.log("Response length:", text.length)
  console.log("Response preview:", text.substring(0, 500))
} else {
  console.log("No content returned")
}

// Test with browser-like headers
const response2 = await fetch(url, {
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    "Accept-Encoding": "gzip, deflate, br",
    Connection: "keep-alive",
    "Upgrade-Insecure-Requests": "1",
  },
  redirect: "follow",
})

console.log("\nTest 2 - Browser-like headers:")
console.log("Status:", response2.status, response2.statusText)
console.log("Headers:", Object.fromEntries(response2.headers.entries()))
console.log("URL after request:", response2.url)
console.log("Redirected:", response2.redirected)

if (response2.status === 200) {
  const text = await response2.text()
  console.log("Response length:", text.length)
  console.log("Response preview:", text.substring(0, 500))
} else {
  console.log("No content returned")
}
