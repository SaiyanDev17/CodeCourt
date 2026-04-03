# Python Judge Docker Image
FROM python:3.11-alpine

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
