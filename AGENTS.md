# AGENTS.md

Project rules for this cinema ticket system:

- Modular Monolith architecture
- Controller -> Service -> Prisma/Repository
- PostgreSQL is the source of truth
- Redis is only for temporary seat holds with TTL
- Use transactions for booking and payment confirmation
- Use Socket.IO rooms by showtime
- Do not introduce microservices, Kafka, RabbitMQ, Kubernetes, or unnecessary infrastructure
