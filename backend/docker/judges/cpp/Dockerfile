# C++ Judge Docker Image
FROM alpine:3.19

WORKDIR /sandbox

# Install g++ compiler and timeout utility
RUN apk add --no-cache g++ coreutils

# Copy judge script
COPY judge.sh /judge.sh
RUN chmod +x /judge.sh

# Run as non-root user
RUN adduser -D -u 1000 judge
USER judge

ENTRYPOINT ["/judge.sh"]
