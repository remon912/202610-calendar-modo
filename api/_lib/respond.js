// 모든 API 응답을 { ok, data } / { ok, error } 형식으로 통일한다.
import { ZodError } from 'zod';

export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function ok(res, data, status = 200) {
  return res.status(status).json({ ok: true, data });
}

export function fail(res, status, code, message) {
  return res.status(status).json({ ok: false, error: { code, message } });
}

// 핸들러를 감싸 예외를 표준 에러 응답으로 바꾼다. 내부 오류 상세는 서버 로그에만 남긴다.
export function handler(methods) {
  return async (req, res) => {
    const fn = methods[req.method];
    if (!fn) {
      res.setHeader('Allow', Object.keys(methods).join(', '));
      return fail(res, 405, 'METHOD_NOT_ALLOWED', '허용되지 않은 요청입니다.');
    }
    try {
      return await fn(req, res);
    } catch (error) {
      if (error instanceof ApiError) return fail(res, error.status, error.code, error.message);
      if (error instanceof ZodError) {
        return fail(res, 400, 'VALIDATION_ERROR', error.issues[0]?.message ?? '입력값을 확인해 주세요.');
      }
      console.error(error);
      return fail(res, 500, 'INTERNAL_ERROR', '서버 오류가 발생했습니다.');
    }
  };
}
