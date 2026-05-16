const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

async function runFunctionalTest() {
  console.log("Running functional test...");

  const response = await fetch(`${BASE_URL}/__routes`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Expected HTTP 200, but got ${response.status}`);
  }

  const routes = data.routes.map(route => route.path);

  if (!routes.includes("/api/rides")) {
    throw new Error("Functional test failed: /api/rides route was not found");
  }

  if (!routes.includes("/api/login")) {
    throw new Error("Functional test failed: /api/login route was not found");
  }

  console.log("Functional test passed successfully.");
  console.log("Checked routes:", routes);
}

runFunctionalTest().catch(error => {
  console.error(error.message);
  process.exit(1);
});