// Booking test script
// Usage: node scripts/bookings_test.js [url] [count] [delaySeconds]
// Example: node scripts/bookings_test.js http://localhost:3000/api/rides 5 0

const fetch = global.fetch || require('node-fetch');

function now() { return new Date().toISOString(); }
const sleep = (ms) => new Promise(res => setTimeout(res, ms));

function formatDuration(ms) {
	const totalSec = Math.floor(ms / 1000);
	const msRem = ms % 1000;
	const hrs = Math.floor(totalSec / 3600);
	const mins = Math.floor((totalSec % 3600) / 60);
	const secs = totalSec % 60;
	return `${hrs}:${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}.${String(msRem).padStart(3,'0')}`;
}

async function parseBody(res) {
	const text = await res.text();
	try { return JSON.parse(text); } catch (e) { return text; }
}

(async () => {
	const url = process.argv[2] || 'http://localhost:3000/api/rides';
	const total = parseInt(process.argv[3], 10) || 10;
	const delaySeconds = parseFloat(process.argv[4]) || 0;

	let successCount = 0;
	let failureCount = 0;
	let errorCount = 0;
	const startTime = Date.now();

	console.log(`${now()} - Sending ${total} booking requests to ${url} with ${delaySeconds}s delay`);

	for (let i = 1; i <= total; i++) {
		const payload = {
			studentId: `test-student-${i}`,
			pickup: { location: `Pickup ${i}`, lat: 21.4225 + i * 0.001, lng: 39.8262 + i * 0.001 },
			destination: { location: `Destination ${i}`, lat: 21.4300 + i * 0.001, lng: 39.8300 + i * 0.001 },
			passengers: 1,
			fare: 5 + i
		};

		try {
			const res = await fetch(url, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});

			const body = await parseBody(res);
			if (res.ok) {
				successCount++;
				console.log(`${now()} #${i}: SUCCESS - HTTP ${res.status}`);
			} else {
				failureCount++;
				console.log(`${now()} #${i}: FAILURE - HTTP ${res.status}`);
			}
			console.log('Response:', body);
		} catch (err) {
			errorCount++;
			console.log(`${now()} #${i}: ERROR - ${err.message}`);
		}

		if (i < total && delaySeconds > 0) await sleep(delaySeconds * 1000);
	}

	console.log('\n=== Summary ===');
	console.log(`Total requests: ${total}`);
	console.log(`Successes: ${successCount}`);
	console.log(`Failures (HTTP non-2xx): ${failureCount}`);
	console.log(`Errors (network/exception): ${errorCount}`);

    const elapsedMs = Date.now() - startTime;
    console.log(`Total time: ${formatDuration(elapsedMs)} (HH:MM:SS.mmm)`);

	process.exit((failureCount + errorCount) > 0 ? 1 : 0);
})();

