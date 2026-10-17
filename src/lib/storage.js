// localStorage 읽기·쓰기. 시크릿 창이나 저장 공간 부족 시에도 앱이 멈추지 않도록 예외를 삼킨다.
export function readStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    console.error(`저장된 데이터(${key})를 읽을 수 없습니다.`, error);
    return fallback;
  }
}

export function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`데이터(${key})를 저장할 수 없습니다.`, error);
    return false;
  }
}
