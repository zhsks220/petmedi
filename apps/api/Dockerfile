FROM node:20-alpine AS builder

WORKDIR /app

# pnpm 설치
RUN npm install -g pnpm

# 루트 package.json과 pnpm 설정 복사
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# 필요한 패키지들의 package.json 복사
COPY apps/api/package.json ./apps/api/
COPY packages/database/package.json ./packages/database/
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/

# 의존성 설치
RUN pnpm install --frozen-lockfile

# 소스 코드 복사
COPY apps/api ./apps/api
COPY packages ./packages

# Prisma 클라이언트 생성
RUN pnpm --filter @petmedi/database exec prisma generate

# API 빌드
RUN pnpm --filter @petmedi/api build

# 프로덕션 이미지
FROM node:20-alpine AS runner

WORKDIR /app

RUN npm install -g pnpm

# 빌드된 파일과 필요한 의존성만 복사
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/package.json ./

WORKDIR /app/apps/api

EXPOSE 4000

ENV NODE_ENV=production
ENV PORT=4000

CMD ["node", "dist/main.js"]
