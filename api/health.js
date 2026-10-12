// 배포·DB 연결 확인용 엔드포인트
import { sql } from './_lib/db.js';
import { handler, ok } from './_lib/respond.js';

export default handler({
  GET: async (req, res) => {
    const [row] = await sql`SELECT now() AS db_time`;
    return ok(res, { status: 'up', dbTime: row.db_time });
  },
});
