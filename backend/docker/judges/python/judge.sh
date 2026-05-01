#!/bin/sh
# Python Judge Script
# Executes Python code against test cases
# Exit codes: 0=AC, 124=TLE, 137=MLE, other=RE

# Run the solution with input from stdin
# timeout and resource limits are handled by Docker
timeout "${TIME_LIMIT:-5}s" python3 /sandbox/solution.py < /sandbox/input.txt
