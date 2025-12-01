import { RateLimiter } from "./lib/rate-limiter";

async function testRateLimiter() {
    console.log("Starting Rate Limiter Test...");
    // Limit to 5 requests per 5 seconds for testing speed
    const limiter = new RateLimiter(5, 5000);
    const start = Date.now();

    for (let i = 1; i <= 10; i++) {
        console.log(`Request ${i} attempting to acquire...`);
        await limiter.acquire();
        const now = Date.now();
        console.log(`Request ${i} acquired at ${now - start}ms`);
    }
    console.log("Test Complete");
}

testRateLimiter();
