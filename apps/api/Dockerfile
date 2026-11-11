FROM golang:1.24-alpine AS build
WORKDIR /src
COPY apps/api/go.mod apps/api/go.sum ./
RUN go mod download
COPY apps/api/ ./
RUN CGO_ENABLED=0 go build -trimpath -o /angkot-api ./cmd/api
FROM alpine:3.22
RUN apk add --no-cache ca-certificates && adduser -D -u 10001 angkot
WORKDIR /app
COPY --from=build /angkot-api ./angkot-api
COPY apps/web/src/data/angkot-routes.json ./routes.json
ENV ROUTES_FILE=/app/routes.json API_ADDR=:8080
USER angkot
EXPOSE 8080
CMD ["./angkot-api"]
