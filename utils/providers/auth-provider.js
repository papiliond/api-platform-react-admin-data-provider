import Cookies from 'js-cookie';
import { fetchMercureSecureJwt } from '../mercure-jwt';

export const decodeJwt = token => {
  try {
    return JSON.parse(window.atob(token.split('.')[1]));
  } catch (e) {
    return null;
  }
};

export const validateToken = () => {
  const token = window.localStorage.getItem('auth');

  if (!token) {
    return false;
  }

  try {
    const decodedToken = decodeJwt(token);
    return Date.now() < decodedToken.exp * 1000;
  } catch (error) {
    console.error(error);
    return false;
  }
};

const cleanup = () => {
  // window.localStorage.removeItem('auth');
  // window.localStorage.removeItem('permissions');
  // window.localStorage.removeItem('user');
  // window.localStorage.removeItem(ORG_LOCAL_STORAGE_KEY);
  window.localStorage.clear();
  Cookies.remove('mercureAuthorization');
};

const authProvider = {
  login: ({ username, password, token }) => {
    return window
      .fetch(
        new window.Request('/api/authentication_token', {
          method: 'POST',
          body: JSON.stringify({ id: username, password }),
          headers: new window.Headers({
            'Content-Type': 'application/json',
            'X-Login': 'All',
            'g-recaptcha-token': token
          })
        })
      )
      .then(response => {
        if (response.status < 200 || response.status >= 300) {
          throw new Error(response.statusText);
        }
        return response.json();
      })
      .then(({ token, data }) => {
        const decodedToken = decodeJwt(token);
        window.localStorage.setItem('auth', token);
        window.localStorage.setItem(
          'permissions',
          JSON.stringify(decodedToken.roles)
        );
        window.localStorage.setItem('user', JSON.stringify(data));

        fetchMercureSecureJwt();
      });
  },
  logout: () => {
    cleanup();
    return Promise.resolve();
  },
  checkAuth: () => {
    if (null === window.localStorage.getItem('permissions')) {
      cleanup();
      return Promise.reject({ redirectTo: '/login' });
    }

    if (!validateToken()) {
      cleanup();
      return Promise.reject({ redirectTo: '/login' });
    }

    return window.localStorage.getItem('auth')
      ? Promise.resolve()
      : Promise.reject({ redirectTo: '/login' });
  },
  checkError: error => {
    let status = error && error.response ? error.response.status : null;
    status = null === status ? error.status : null;
    if (status === 401 || status === 403) {
      window.localStorage.removeItem('auth');
      return Promise.reject();
    }
    return Promise.resolve();
  },
  getIdentity: () => {
    if (
      !window.localStorage.getItem('user') ||
      !window.localStorage.getItem('auth')
    ) {
      return;
    }

    try {
      const { id, fullname, avatar } = JSON.parse(
        window.localStorage.getItem('user')
      );
      return Promise.resolve({
        id,
        fullname,
        avatar
        // Use 'fullName' for displaying name in the header
        // fullName: fullname,
      });
    } catch (error) {
      return Promise.reject(error);
    }
  },
  getPermissions: () => {
    const role = JSON.parse(window.localStorage.getItem('permissions'));
    return role ? Promise.resolve(role) : Promise.reject();
  }
};

export const authCleanup = cleanup;

export default authProvider;
