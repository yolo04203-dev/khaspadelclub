/**
 * Load Testing Utilities for 2000 Concurrent Users Simulation
 * 
 * This module provides utilities for simulating high-traffic scenarios
 * and measuring application performance under load.
 */

import { supabase } from "@/integrations/supabase/client";

export interface LoadTestConfig {
  concurrentUsers: number;
  testDuration: number; // in seconds
  rampUpTime: number; // in seconds
  endpoints: TestEndpoint[];
}

export interface TestEndpoint {
  name: string;
  type: "query" | "mutation" | "subscription";
  weight: number; // probability weight (0-1)
  execute: () => Promise<unknown>;
}

export interface LoadTestResult {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  p50ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  requestsPerSecond: number;
  errorRate: number;
  errors: ErrorDetail[];
  endpointStats: EndpointStats[];
}

export interface ErrorDetail {
  endpoint: string;
  message: string;
  count: number;
}

export interface EndpointStats {
  name: string;
  totalRequests: number;
  successfulRequests: number;
  averageResponseTime: number;
  p95ResponseTime: number;
}

interface RequestMetric {
  endpoint: string;
  startTime: number;
  endTime: number;
  success: boolean;
  error?: string;
}

// Default test endpoints matching real application usage patterns
export const defaultEndpoints: TestEndpoint[] = [
  {
    name: "Dashboard - Fetch Challenges",
    type: "query",
    weight: 0.20,
    execute: async () => {
      return supabase
        .from("challenges")
        .select(`
          *,
          challenger_team:teams!challenges_challenger_team_id_fkey(id, name),
          challenged_team:teams!challenges_challenged_team_id_fkey(id, name)
        `)
        .limit(50);
    },
  },
  {
    name: "Ladder - Fetch Rankings",
    type: "query",
    weight: 0.25,
    execute: async () => {
      return supabase
        .from("ladder_rankings")
        .select(`
          *,
          team:teams(id, name, avatar_url),
          ladder_category:ladder_categories(id, name)
        `)
        .order("rank", { ascending: true })
        .limit(100);
    },
  },
  {
    name: "Teams - Fetch Team List",
    type: "query",
    weight: 0.15,
    execute: async () => {
      return supabase
        .from("teams")
        .select(`
          *,
          team_members(id, user_id, is_captain)
        `)
        .limit(50);
    },
  },
  {
    name: "Matches - Fetch History",
    type: "query",
    weight: 0.10,
    execute: async () => {
      return supabase
        .from("matches")
        .select(`
          *,
          challenger_team:teams!matches_challenger_team_id_fkey(id, name),
          challenged_team:teams!matches_challenged_team_id_fkey(id, name)
        `)
        .order("created_at", { ascending: false })
        .limit(50);
    },
  },
  {
    name: "Profiles - Fetch Players",
    type: "query",
    weight: 0.10,
    execute: async () => {
      return supabase
        .from("profiles")
        .select("*")
        .limit(100);
    },
  },
  {
    name: "Mutation - Update Profile",
    type: "mutation",
    weight: 0.08,
    execute: async () => {
      // Simulates a profile update (will fail without auth, counted as mutation load)
      return supabase
        .from("profiles")
        .update({ updated_at: new Date().toISOString() })
        .eq("user_id", "00000000-0000-0000-0000-000000000000");
    },
  },
  {
    name: "Mutation - Create Challenge",
    type: "mutation",
    weight: 0.07,
    execute: async () => {
      // Simulates challenge creation load (RLS will reject without auth)
      return supabase
        .from("challenges")
        .insert({
          challenger_team_id: "00000000-0000-0000-0000-000000000000",
          challenged_team_id: "00000000-0000-0000-0000-000000000001",
          expires_at: new Date(Date.now() + 86400000).toISOString(),
        });
    },
  },
  {
    name: "Tournaments - Fetch List",
    type: "query",
    weight: 0.05,
    execute: async () => {
      return supabase
        .from("tournaments")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
    },
  },
];

/**
 * Calculate percentile from sorted array of numbers
 */
function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

/**
 * Select endpoint based on weighted probability
 */
function selectEndpoint(endpoints: TestEndpoint[]): TestEndpoint {
  const totalWeight = endpoints.reduce((sum, e) => sum + e.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const endpoint of endpoints) {
    random -= endpoint.weight;
    if (random <= 0) {
      return endpoint;
    }
  }
  
  return endpoints[endpoints.length - 1];
}

/**
 * Execute a single request and measure timing
 */
async function executeRequest(endpoint: TestEndpoint): Promise<RequestMetric> {
  const startTime = performance.now();
  let success = true;
  let error: string | undefined;
  
  try {
    const result = await endpoint.execute();
    // Check for Supabase errors
    if (result && typeof result === "object" && "error" in result && result.error) {
      success = false;
      error = (result.error as { message?: string }).message || "Unknown error";
    }
  } catch (e) {
    success = false;
    error = e instanceof Error ? e.message : "Unknown error";
  }
  
  const endTime = performance.now();
  
  return {
    endpoint: endpoint.name,
    startTime,
    endTime,
    success,
    error,
  };
}

/**
 * Run load test with specified configuration
 */
export async function runLoadTest(
  config: Partial<LoadTestConfig> = {}
): Promise<LoadTestResult> {
  const {
    concurrentUsers = 100,
    testDuration = 60,
    rampUpTime = 10,
    endpoints = defaultEndpoints,
  } = config;

  console.log(`🚀 Starting load test with ${concurrentUsers} concurrent users`);
  console.log(`📊 Test duration: ${testDuration}s, Ramp-up: ${rampUpTime}s`);

  const metrics: RequestMetric[] = [];
  const startTime = Date.now();
  const endTime = startTime + testDuration * 1000;
  
  // Calculate user ramp-up intervals
  const usersPerInterval = Math.ceil(concurrentUsers / (rampUpTime * 10));
  let activeUsers = 0;
  
  const userPromises: Promise<void>[] = [];
  
  // Simulate users joining gradually
  const addUsers = () => {
    const usersToAdd = Math.min(usersPerInterval, concurrentUsers - activeUsers);
    
    for (let i = 0; i < usersToAdd; i++) {
      activeUsers++;
      const userId = activeUsers;
      
      // Each user runs requests until test ends
      const userSession = async () => {
        while (Date.now() < endTime) {
          const endpoint = selectEndpoint(endpoints);
          const metric = await executeRequest(endpoint);
          metrics.push(metric);
          
          // Random delay between requests (100-500ms)
          await new Promise(resolve => 
            setTimeout(resolve, Math.random() * 400 + 100)
          );
        }
      };
      
      userPromises.push(userSession());
    }
    
    if (activeUsers < concurrentUsers && Date.now() < startTime + rampUpTime * 1000) {
      setTimeout(addUsers, 100);
    }
  };
  
  // Start ramping up users
  addUsers();
  
  // Wait for all users to complete
  await Promise.all(userPromises);
  
  // Calculate results
  const responseTimes = metrics.map(m => m.endTime - m.startTime);
  const successfulMetrics = metrics.filter(m => m.success);
  const failedMetrics = metrics.filter(m => !m.success);
  
  // Group errors
  const errorMap = new Map<string, ErrorDetail>();
  for (const metric of failedMetrics) {
    const key = `${metric.endpoint}:${metric.error}`;
    if (errorMap.has(key)) {
      errorMap.get(key)!.count++;
    } else {
      errorMap.set(key, {
        endpoint: metric.endpoint,
        message: metric.error || "Unknown error",
        count: 1,
      });
    }
  }
  
  // Calculate per-endpoint stats
  const endpointStatsMap = new Map<string, RequestMetric[]>();
  for (const metric of metrics) {
    if (!endpointStatsMap.has(metric.endpoint)) {
      endpointStatsMap.set(metric.endpoint, []);
    }
    endpointStatsMap.get(metric.endpoint)!.push(metric);
  }
  
  const endpointStats: EndpointStats[] = Array.from(endpointStatsMap.entries()).map(
    ([name, endpointMetrics]) => {
      const times = endpointMetrics.map(m => m.endTime - m.startTime);
      const successful = endpointMetrics.filter(m => m.success);
      
      return {
        name,
        totalRequests: endpointMetrics.length,
        successfulRequests: successful.length,
        averageResponseTime: times.reduce((a, b) => a + b, 0) / times.length,
        p95ResponseTime: percentile(times, 95),
      };
    }
  );
  
  const actualDuration = (Date.now() - startTime) / 1000;
  
  const result: LoadTestResult = {
    totalRequests: metrics.length,
    successfulRequests: successfulMetrics.length,
    failedRequests: failedMetrics.length,
    averageResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
    p50ResponseTime: percentile(responseTimes, 50),
    p95ResponseTime: percentile(responseTimes, 95),
    p99ResponseTime: percentile(responseTimes, 99),
    minResponseTime: Math.min(...responseTimes),
    maxResponseTime: Math.max(...responseTimes),
    requestsPerSecond: metrics.length / actualDuration,
    errorRate: (failedMetrics.length / metrics.length) * 100,
    errors: Array.from(errorMap.values()),
    endpointStats,
  };
  
  console.log("\n📈 Load Test Results:");
  console.log(`   Total Requests: ${result.totalRequests}`);
  console.log(`   Successful: ${result.successfulRequests} (${(100 - result.errorRate).toFixed(2)}%)`);
  console.log(`   Failed: ${result.failedRequests} (${result.errorRate.toFixed(2)}%)`);
  console.log(`   Avg Response Time: ${result.averageResponseTime.toFixed(2)}ms`);
  console.log(`   P95 Response Time: ${result.p95ResponseTime.toFixed(2)}ms`);
  console.log(`   P99 Response Time: ${result.p99ResponseTime.toFixed(2)}ms`);
  console.log(`   Requests/Second: ${result.requestsPerSecond.toFixed(2)}`);
  
  return result;
}

/**
 * Quick smoke test with minimal load
 */
export async function smokeTest(): Promise<LoadTestResult> {
  return runLoadTest({
    concurrentUsers: 10,
    testDuration: 10,
    rampUpTime: 2,
  });
}

/**
 * Standard load test for normal traffic
 */
export async function standardLoadTest(): Promise<LoadTestResult> {
  return runLoadTest({
    concurrentUsers: 100,
    testDuration: 60,
    rampUpTime: 10,
  });
}

/**
 * Stress test with 2000 concurrent users
 */
export async function stressTest(): Promise<LoadTestResult> {
  return runLoadTest({
    concurrentUsers: 2000,
    testDuration: 120,
    rampUpTime: 30,
  });
}

/**
 * Test specific endpoint performance
 */
export async function testEndpoint(
  endpoint: TestEndpoint,
  iterations: number = 100
): Promise<{
  avgTime: number;
  p95Time: number;
  successRate: number;
}> {
  const metrics: RequestMetric[] = [];
  
  for (let i = 0; i < iterations; i++) {
    const metric = await executeRequest(endpoint);
    metrics.push(metric);
  }
  
  const times = metrics.map(m => m.endTime - m.startTime);
  const successful = metrics.filter(m => m.success);
  
  return {
    avgTime: times.reduce((a, b) => a + b, 0) / times.length,
    p95Time: percentile(times, 95),
    successRate: (successful.length / metrics.length) * 100,
  };
}
