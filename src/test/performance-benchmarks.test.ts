import { describe, it, expect, beforeAll } from "vitest";
import { 
  runLoadTest, 
  smokeTest, 
  testEndpoint, 
  defaultEndpoints,
  type LoadTestResult 
} from "./load-test";

// Performance thresholds from the plan
const THRESHOLDS = {
  dashboardLoad: { acceptable: 3000, target: 1500 },
  ladderFetch: { acceptable: 2000, target: 800 },
  challengeSubmission: { acceptable: 1000, target: 300 },
  errorRate: { acceptable: 1, target: 0.1 },
};

describe("Performance Benchmarks", () => {
  describe("Smoke Tests", () => {
    it("should complete smoke test with acceptable performance", async () => {
      const result = await smokeTest();
      
      expect(result.totalRequests).toBeGreaterThan(0);
      expect(result.errorRate).toBeLessThan(THRESHOLDS.errorRate.acceptable);
      expect(result.averageResponseTime).toBeLessThan(THRESHOLDS.dashboardLoad.acceptable);
    }, 30000); // 30 second timeout
  });

  describe("Individual Endpoint Performance", () => {
    it("should fetch challenges within acceptable time", async () => {
      const challengeEndpoint = defaultEndpoints.find(e => 
        e.name.includes("Challenges")
      );
      
      if (challengeEndpoint) {
        const result = await testEndpoint(challengeEndpoint, 20);
        
        console.log(`Challenges endpoint: avg=${result.avgTime.toFixed(2)}ms, p95=${result.p95Time.toFixed(2)}ms`);
        
        expect(result.avgTime).toBeLessThan(THRESHOLDS.dashboardLoad.acceptable);
        expect(result.successRate).toBeGreaterThan(99);
      }
    }, 60000);

    it("should fetch ladder rankings within acceptable time", async () => {
      const ladderEndpoint = defaultEndpoints.find(e => 
        e.name.includes("Rankings")
      );
      
      if (ladderEndpoint) {
        const result = await testEndpoint(ladderEndpoint, 20);
        
        console.log(`Ladder endpoint: avg=${result.avgTime.toFixed(2)}ms, p95=${result.p95Time.toFixed(2)}ms`);
        
        expect(result.avgTime).toBeLessThan(THRESHOLDS.ladderFetch.acceptable);
        expect(result.successRate).toBeGreaterThan(99);
      }
    }, 60000);

    it("should fetch teams within acceptable time", async () => {
      const teamsEndpoint = defaultEndpoints.find(e => 
        e.name.includes("Team List")
      );
      
      if (teamsEndpoint) {
        const result = await testEndpoint(teamsEndpoint, 20);
        
        console.log(`Teams endpoint: avg=${result.avgTime.toFixed(2)}ms, p95=${result.p95Time.toFixed(2)}ms`);
        
        expect(result.avgTime).toBeLessThan(THRESHOLDS.dashboardLoad.acceptable);
        expect(result.successRate).toBeGreaterThan(99);
      }
    }, 60000);

    it("should fetch matches within acceptable time", async () => {
      const matchesEndpoint = defaultEndpoints.find(e => 
        e.name.includes("Matches")
      );
      
      if (matchesEndpoint) {
        const result = await testEndpoint(matchesEndpoint, 20);
        
        console.log(`Matches endpoint: avg=${result.avgTime.toFixed(2)}ms, p95=${result.p95Time.toFixed(2)}ms`);
        
        expect(result.avgTime).toBeLessThan(THRESHOLDS.dashboardLoad.acceptable);
        expect(result.successRate).toBeGreaterThan(99);
      }
    }, 60000);

    it("should fetch profiles within acceptable time", async () => {
      const profilesEndpoint = defaultEndpoints.find(e => 
        e.name.includes("Players")
      );
      
      if (profilesEndpoint) {
        const result = await testEndpoint(profilesEndpoint, 20);
        
        console.log(`Profiles endpoint: avg=${result.avgTime.toFixed(2)}ms, p95=${result.p95Time.toFixed(2)}ms`);
        
        expect(result.avgTime).toBeLessThan(THRESHOLDS.dashboardLoad.acceptable);
        expect(result.successRate).toBeGreaterThan(99);
      }
    }, 60000);
  });

  describe("Load Test - 100 Concurrent Users", () => {
    let result: LoadTestResult;

    beforeAll(async () => {
      result = await runLoadTest({
        concurrentUsers: 100,
        testDuration: 30,
        rampUpTime: 5,
      });
    }, 120000); // 2 minute timeout

    it("should maintain acceptable error rate", () => {
      expect(result.errorRate).toBeLessThan(THRESHOLDS.errorRate.acceptable);
    });

    it("should maintain acceptable average response time", () => {
      expect(result.averageResponseTime).toBeLessThan(THRESHOLDS.dashboardLoad.acceptable);
    });

    it("should maintain acceptable P95 response time", () => {
      expect(result.p95ResponseTime).toBeLessThan(THRESHOLDS.dashboardLoad.acceptable * 1.5);
    });

    it("should process minimum requests per second", () => {
      // At least 10 requests per second with 100 users
      expect(result.requestsPerSecond).toBeGreaterThan(10);
    });
  });

  describe("Stress Test - 500 Concurrent Users", () => {
    let result: LoadTestResult;

    beforeAll(async () => {
      result = await runLoadTest({
        concurrentUsers: 500,
        testDuration: 30,
        rampUpTime: 10,
      });
    }, 180000); // 3 minute timeout

    it("should maintain error rate under 5% at high load", () => {
      expect(result.errorRate).toBeLessThan(5);
    });

    it("should maintain P95 response time under degraded threshold", () => {
      // Allow 2x threshold under stress
      expect(result.p95ResponseTime).toBeLessThan(THRESHOLDS.dashboardLoad.acceptable * 2);
    });

    it("should log performance metrics for analysis", () => {
      console.log("\n📊 Stress Test (500 users) Summary:");
      console.log(`   Total Requests: ${result.totalRequests}`);
      console.log(`   Success Rate: ${(100 - result.errorRate).toFixed(2)}%`);
      console.log(`   Avg Response: ${result.averageResponseTime.toFixed(2)}ms`);
      console.log(`   P50 Response: ${result.p50ResponseTime.toFixed(2)}ms`);
      console.log(`   P95 Response: ${result.p95ResponseTime.toFixed(2)}ms`);
      console.log(`   P99 Response: ${result.p99ResponseTime.toFixed(2)}ms`);
      console.log(`   RPS: ${result.requestsPerSecond.toFixed(2)}`);
      
      if (result.errors.length > 0) {
        console.log("\n   Top Errors:");
        result.errors.slice(0, 5).forEach(e => {
          console.log(`   - ${e.endpoint}: ${e.message} (${e.count}x)`);
        });
      }
      
      console.log("\n   Endpoint Breakdown:");
      result.endpointStats.forEach(stat => {
        console.log(`   - ${stat.name}: ${stat.totalRequests} reqs, ${stat.averageResponseTime.toFixed(2)}ms avg, p95=${stat.p95ResponseTime.toFixed(2)}ms`);
      });
      
      expect(result).toBeDefined();
    });
  });
});

describe("Benchmark Verification", () => {
  it("should have all expected endpoints defined", () => {
    expect(defaultEndpoints.length).toBeGreaterThanOrEqual(5);
    
    const endpointNames = defaultEndpoints.map(e => e.name);
    expect(endpointNames.some(n => n.includes("Challenges"))).toBe(true);
    expect(endpointNames.some(n => n.includes("Rankings"))).toBe(true);
    expect(endpointNames.some(n => n.includes("Team"))).toBe(true);
    expect(endpointNames.some(n => n.includes("Matches"))).toBe(true);
    expect(endpointNames.some(n => n.includes("Players"))).toBe(true);
  });

  it("should have valid endpoint weights summing to 1", () => {
    const totalWeight = defaultEndpoints.reduce((sum, e) => sum + e.weight, 0);
    expect(totalWeight).toBeCloseTo(1, 2);
  });
});
