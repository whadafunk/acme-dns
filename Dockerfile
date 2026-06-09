FROM --platform=$BUILDPLATFORM debian:bookworm-slim AS builder

ARG ACME_DNS_VERSION=v2.0.2
ARG TARGETARCH

RUN apt-get update && apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        git \
    && rm -rf /var/lib/apt/lists/*

ARG GO_VERSION=1.23.5
RUN curl -fsSL "https://go.dev/dl/go${GO_VERSION}.linux-${TARGETARCH}.tar.gz" \
    | tar -C /usr/local -xz

ENV PATH="/usr/local/go/bin:${PATH}"

RUN git clone --depth 1 --branch ${ACME_DNS_VERSION} \
        https://github.com/acme-dns/acme-dns /src/acme-dns

WORKDIR /src/acme-dns
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o acme-dns .


FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /etc/acme-dns /var/lib/acme-dns

COPY --from=builder /src/acme-dns/acme-dns /usr/local/bin/acme-dns

VOLUME ["/etc/acme-dns", "/var/lib/acme-dns"]

EXPOSE 53/tcp 53/udp 80/tcp 443/tcp

ENTRYPOINT ["acme-dns"]
