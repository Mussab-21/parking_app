# ParkSmart - Smart Car Parking Pakistan

A parking marketplace and reservation platform for Pakistan.

## Prerequisites
- Node.js (LTS)
- Docker & Docker Compose
- Flutter SDK (for mobile development)
- pnpm (recommended)

## Quick Start

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd CarParkingApp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the backend and database**
   ```bash
   docker compose up -d
   ```

4. **Run the API (locally for development)**
   ```bash
   npm run start:dev --prefix apps/api
   ```

5. **Run the Admin Portal**
   ```bash
   npm run dev --prefix apps/admin-portal
   ```

## Repository Structure
- `apps/api`: NestJS Backend
- `apps/admin-portal`: Next.js Web Portal
- `apps/mobile`: Flutter Mobile App
- `docs/`: Project documentation and ADRs
- `docker/`: Dockerfiles and configuration
