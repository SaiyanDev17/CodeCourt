# C++ Judge Docker Image
FROM gcc:13-alpine

WORKDIR /sandbox

# Install timeout utility
RUN apk add --no-cache coreutils

# Copy judge script
COPY judge.sh /judge.sh
RUN chmod +x /judge.sh

# Run as non-root user
RUN adduser -D -u 1000 judge
USER judge

ENTRYPOINT ["/judge.sh"]
