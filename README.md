# AgreeWe

This is the backend architecture of AgreeWe software.

## Prerequisites

- Docker ([https://docs.docker.com/install](https://docs.docker.com/install))
- NodeJS find version in `.nvmrc` file (prefer install
  with [https://github.com/nvm-sh/nvm](https://github.com/nvm-sh/nvm))
- IDE (prefer [https://www.jetbrains.com/webstorm/download](https://www.jetbrains.com/webstorm/download))

## Setup for development:

- Install node dependencies

```sh
yarn install
```

## Test

- Unit tests

```sh
yarn test:unit
```

- Integration tests with docker

```sh
yarn test:integration
```

- Integration tests outside docker

  1. start postgres and mongodb

  ```sh
  docker-compose -f docker-compose.test.yml up --build postgres mongodb
  ```

  2. Run db migration

  ```sh
  yarn postgres:migrate up
  ```

  3. copy the content of test/test.env to .env

  4. Run services

  ```sh
  yarn service:api
  ```

  5. Note: do not forget to clean the .env before running the unit test. To restart the integration test you need to
     stop everything and restart from scratch, include the database data(make a `docker-compose down`)

#### Note

All test suit can be run in docker by prefixing all npm command by `docker:` (eg: `yarn docker:test:unit`)

## Run locally

- Start all the dependencies

```sh
yarn docker:dependencies
```

- Run the database migration

```sh
yarn postgres:migrate up
```

- Destroy database and create from scratch

```sh
yarn postgres:create
```

- Start all services (not recommended)

```sh
yarn service:main
```

- Start separate services

```sh
yarn service:api
```

## Stop

```sh
docker-compose down
```

## Environment

You can set environment variables in the `.env` file, you can find examples in .env.sample
