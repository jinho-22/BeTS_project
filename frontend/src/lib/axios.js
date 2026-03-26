import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // HttpOnly 쿠키 자동 전송
});

// 요청 인터셉터: FormData 지원
api.interceptors.request.use(
  (config) => {
    // FormData일 경우 Content-Type을 삭제하여 브라우저가 boundary 포함 자동 설정
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── 토큰 갱신 동시성 제어 ─────────────────────
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

// 응답 인터셉터: 토큰 만료 시 쿠키 기반 리프레시
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // 401이 아니거나 이미 재시도한 요청이면 그냥 reject
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // 로그인/리프레시 요청 자체가 실패한 경우 refresh 시도 안 함
    if (originalRequest.url === '/auth/login' || originalRequest.url === '/auth/refresh') {
      if (originalRequest.url === '/auth/refresh') {
        useAuthStore.getState().logout();
      }
      return Promise.reject(error);
    }

    // 이미 다른 요청이 refresh 중이면 큐에 대기
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then(() => {
        return api(originalRequest);
      }).catch((err) => {
        return Promise.reject(err);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      // 쿠키에 refreshToken이 자동 포함됨
      await api.post('/auth/refresh');
      processQueue(null);

      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError);
      useAuthStore.getState().logout();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
