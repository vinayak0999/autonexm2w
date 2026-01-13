#!/usr/bin/env python3
"""
Load test script for API endpoints
Tests concurrent requests to simulate 50 users taking a test
"""
import asyncio
import aiohttp
import time
import statistics

# Configuration
BASE_URL = "https://autonexm2w-production.up.railway.app"
CONCURRENT_USERS = 50
REQUESTS_PER_USER = 5  # 5 questions each
DELAY_BETWEEN_REQUESTS = 0.5  # 500ms between user actions

# Test endpoints
ENDPOINTS = [
    ("GET", "/", "Health Check"),
    ("GET", "/admin/tests", "Admin Tests"),
]

async def single_user_session(session, user_id, results):
    """Simulate a single user making requests"""
    for req_num in range(REQUESTS_PER_USER):
        for method, endpoint, name in ENDPOINTS:
            url = f"{BASE_URL}{endpoint}"
            start = time.perf_counter()
            try:
                async with session.request(method, url, timeout=aiohttp.ClientTimeout(total=15)) as response:
                    await response.text()
                    elapsed = (time.perf_counter() - start) * 1000
                    results.append({
                        "user": user_id,
                        "endpoint": name,
                        "success": response.status < 400,
                        "status": response.status,
                        "time_ms": elapsed
                    })
            except Exception as e:
                elapsed = (time.perf_counter() - start) * 1000
                results.append({
                    "user": user_id,
                    "endpoint": name,
                    "success": False,
                    "status": 0,
                    "time_ms": elapsed,
                    "error": str(e)[:50]
                })
        
        # Delay between requests (simulating user thinking)
        await asyncio.sleep(DELAY_BETWEEN_REQUESTS)

async def run_load_test():
    """Run the load test"""
    print(f"🚀 Load Testing: {BASE_URL}")
    print(f"👥 Simulating: {CONCURRENT_USERS} concurrent users")
    print(f"📊 Each user makes: {REQUESTS_PER_USER * len(ENDPOINTS)} requests")
    print("-" * 60)
    
    # Use connection pooling with limits
    connector = aiohttp.TCPConnector(limit=100, limit_per_host=50)
    async with aiohttp.ClientSession(connector=connector) as session:
        results = []
        
        start_time = time.perf_counter()
        
        # Create all user tasks
        tasks = [single_user_session(session, i, results) for i in range(CONCURRENT_USERS)]
        
        # Run all users concurrently
        await asyncio.gather(*tasks)
        
        total_time = time.perf_counter() - start_time
        
        # Calculate stats by endpoint
        print(f"\n📈 RESULTS ({total_time:.1f}s total)")
        print("=" * 60)
        
        for method, endpoint, name in ENDPOINTS:
            endpoint_results = [r for r in results if r["endpoint"] == name]
            successful = [r for r in endpoint_results if r["success"]]
            failed = [r for r in endpoint_results if not r["success"]]
            
            if successful:
                times = [r["time_ms"] for r in successful]
                avg_time = statistics.mean(times)
                p95_time = sorted(times)[int(len(times) * 0.95)] if len(times) > 1 else times[0]
                min_time = min(times)
                max_time = max(times)
            else:
                avg_time = p95_time = min_time = max_time = 0
            
            status = "✅" if len(failed) == 0 else "⚠️" if len(successful) > len(failed) else "❌"
            print(f"\n{status} {name} ({endpoint})")
            print(f"   Total: {len(endpoint_results)} | Success: {len(successful)} | Failed: {len(failed)}")
            print(f"   Avg: {avg_time:.0f}ms | P95: {p95_time:.0f}ms | Min: {min_time:.0f}ms | Max: {max_time:.0f}ms")
            
            if failed:
                errors = {}
                for r in failed:
                    err = r.get("error", f"Status {r['status']}")
                    errors[err] = errors.get(err, 0) + 1
                print(f"   Errors: {errors}")
        
        # Summary
        total_success = sum(1 for r in results if r["success"])
        total_failed = sum(1 for r in results if not r["success"])
        rps = len(results) / total_time
        
        print("\n" + "=" * 60)
        print(f"📋 SUMMARY")
        print(f"   Total Requests: {len(results)}")
        print(f"   ✅ Successful: {total_success} ({total_success/len(results)*100:.1f}%)")
        print(f"   ❌ Failed: {total_failed}")
        print(f"   📊 Requests/sec: {rps:.1f}")
        print(f"   ⏱️  Total Time: {total_time:.1f}s")
        
        if total_failed == 0:
            print("\n✅ LOAD TEST PASSED - Ready for 50 concurrent users!")
        elif total_success > total_failed:
            print("\n⚠️  LOAD TEST PARTIAL - Some failures detected")
        else:
            print("\n❌ LOAD TEST FAILED - Many failures detected")

if __name__ == "__main__":
    asyncio.run(run_load_test())
