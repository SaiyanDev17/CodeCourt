#!/bin/sh
# C++ Judge Script
# Compiles and executes C++ code against test cases
# Exit codes: 0=AC, 124=TLE, 137=MLE, other=RE

# Compile the solution
g++ -O2 -std=c++17 -o /sandbox/solution /sandbox/solution.cpp 2>/sandbox/compile_error.txt

if [ $? -ne 0 ]; then
    echo "CE"
    cat /sandbox/compile_error.txt >&2
    exit 1
fi

# Run the solution with input from stdin
# timeout and resource limits are handled by Docker
timeout "${TIME_LIMIT:-5}s" /sandbox/solution < /sandbox/input.txt
