// Neon 연결 공통 모듈. 태그드 템플릿(sql`...${value}`)만 사용해 값이 항상 파라미터로 바인딩되게 한다.
import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL 환경변수가 설정되지 않았습니다.');
}

export const sql = neon(process.env.DATABASE_URL);
