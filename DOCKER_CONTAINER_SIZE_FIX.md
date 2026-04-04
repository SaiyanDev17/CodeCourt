# Docker Container Size Fix

## Problem Identified
Container sizes were growing continuously due to:
1. **MongoDB verbose checkpoint logging** - WiredTiger was logging checkpoint progress every 60 seconds
2. **No log rotation** - Docker logs were accumulating indefinitely
3. **No Redis memory limits** - Redis could grow without bounds

## Fixes Applied

### 1. Log Rotation (All Containers)
Added to all services in `docker-compose.yml` and `docker-compose.prod.yml`:
```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"    # Max 10MB per log file
    max-file: "3"      # Keep only 3 rotated files
```
This limits total log storage to ~30MB per container.

### 2. MongoDB Quiet Mode
Updated MongoDB command to suppress verbose checkpoint logging:
```yaml
command: ["mongod", "--quiet", "--setParameter", "diagnosticDataCollectionEnabled=false", "--wiredTigerEngineConfigString", "verbose=[checkpoint:0]"]
```
- `--quiet`: Reduces general logging verbosity
- `diagnosticDataCollectionEnabled=false`: Disables diagnostic data collection
- `verbose=[checkpoint:0]`: Disables WiredTiger checkpoint progress messages

### 3. Redis Memory Limits
Added Redis memory management:
```yaml
command: ["redis-server", "--maxmemory", "256mb", "--maxmemory-policy", "allkeys-lru", "--save", "900", "1"]
```
- `--maxmemory 256mb`: Hard limit on Redis memory usage
- `--maxmemory-policy allkeys-lru`: Evict least recently used keys when limit reached
- `--save 900 1`: Persist to disk every 15 minutes if at least 1 key changed

### 4. Cleanup
- Removed obsolete `version: '3.8'` from docker-compose files

## Verification Results

### Container Sizes (Writable Layer)
- `codecourt-mongo-1`: 8.19kB (stable, not growing)
- `codecourt-redis-1`: 4.1kB (stable, not growing)

### Volume Sizes
- `codecourt_mongo-data`: 300.3 MB (MongoDB journal pre-allocation - **this is normal**)
  - `/data/db/journal`: 301MB (3x 100MB pre-allocated journal files - reused, not growing)
  - Actual data: ~500KB
- `codecourt_redis-data`: 0 Bytes

### Log Growth Test
- MongoDB logs: 0 new lines over 65 seconds (checkpoint spam eliminated ✓)
- Journal directory: 0 bytes growth over 2 minutes (stable ✓)
- Container sizes: No growth over 2 minutes (stable ✓)

### Configuration Verification
```bash
# MongoDB running with correct flags
docker inspect codecourt-mongo-1 --format='{{.Args}}'
# Output: [mongod --quiet --setParameter diagnosticDataCollectionEnabled=false --wiredTigerEngineConfigString verbose=[checkpoint:0]]

# Redis running with memory limits
docker inspect codecourt-redis-1 --format='{{.Args}}'
# Output: [redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru --save 900 1]

# Log rotation enabled
docker inspect codecourt-mongo-1 --format='{{.HostConfig.LogConfig.Config}}'
# Output: map[max-file:3 max-size:10m]
```

## Impact
- ✅ Container log files will no longer grow indefinitely (max 30MB per container)
- ✅ Redis memory usage is bounded (256MB hard limit)
- ✅ MongoDB checkpoint spam eliminated (was logging every 60 seconds)
- ✅ Container writable layers remain tiny (4-8KB)

## Important Note
The 300MB `codecourt_mongo-data` volume is **NOT a problem**. This is MongoDB's pre-allocated journal space (3x 100MB files) which is reused and does not grow. This is standard MongoDB behavior and necessary for crash recovery.
