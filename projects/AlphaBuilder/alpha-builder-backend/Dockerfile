FROM postgres:16

# Configure the default database and credentials.
# These should line up with the Prisma datasource configuration.
ENV POSTGRES_DB=alpha-builder-db
ENV POSTGRES_USER=user
ENV POSTGRES_PASSWORD=password

# Expose the PostgreSQL port. Map it with `-p 5432:5432` when running the container.
EXPOSE 5432

# No additional initialization scripts are provided here.
# Run Prisma migrations after the container is up to create the required tables.
